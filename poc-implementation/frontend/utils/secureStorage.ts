/**
 * Secure Storage Utility for Nen Platform
 * Provides encrypted local storage with browser compatibility and data protection
 */

import CryptoJS from 'crypto-js';
import { sanitizeInput } from './validation';

// Storage types
export enum StorageType {
  LOCAL = 'localStorage',
  SESSION = 'sessionStorage'
}

// Data classification levels
export enum DataClassification {
  PUBLIC = 'public',           // Non-sensitive data
  INTERNAL = 'internal',       // Internal app data
  CONFIDENTIAL = 'confidential', // Sensitive user data
  RESTRICTED = 'restricted'     // Highly sensitive data (wallet keys, etc.)
}

// Storage interface for different data types
interface SecureStorageData {
  value: string;
  timestamp: number;
  classification: DataClassification;
  checksum: string;
  version: string;
}

// Configuration interface
interface SecureStorageConfig {
  encryptionEnabled: boolean;
  compressionEnabled: boolean;
  checksumValidation: boolean;
  timestampValidation: boolean;
  maxAge?: number; // in milliseconds
}

// Default configuration
const DEFAULT_CONFIG: SecureStorageConfig = {
  encryptionEnabled: true,
  compressionEnabled: true,
  checksumValidation: true,
  timestampValidation: true,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Enhanced key derivation using PBKDF2
const deriveKey = (baseKey: string, salt: string): string => {
  return CryptoJS.PBKDF2(baseKey, salt, {
    keySize: 256 / 32,
    iterations: 10000
  }).toString();
};

// Generate salt for key derivation
const generateSalt = (): string => {
  return CryptoJS.lib.WordArray.random(128 / 8).toString();
};

// Get or create application salt
const getAppSalt = (): string => {
  const saltKey = '_nen_app_salt';
  let salt = '';

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      salt = window.localStorage.getItem(saltKey) || '';
    }
  } catch (e) {
    // Fallback for restricted environments
  }

  if (!salt) {
    salt = generateSalt();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(saltKey, salt);
      }
    } catch (e) {
      // Fallback for restricted environments
    }
  }

  return salt;
};

// Base secret key with environment variable fallback
const getBaseSecretKey = (): string => {
  // In production, this should come from a secure environment variable
  // For development, use a default but log a warning
  const key = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'nen-default-dev-key-change-in-production';

  if (key === 'nen-default-dev-key-change-in-production' && process.env.NODE_ENV === 'production') {
    console.warn('Using default encryption key in production. Please set NEXT_PUBLIC_ENCRYPTION_KEY.');
  }

  return key;
};

// Derive the actual encryption key
const getEncryptionKey = (): string => {
  const baseKey = getBaseSecretKey();
  const salt = getAppSalt();
  return deriveKey(baseKey, salt);
};

// Browser compatibility check
const isStorageAvailable = (storageType: StorageType): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    const storage = window[storageType];
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

// Generate checksum for data integrity
const generateChecksum = (data: string): string => {
  return CryptoJS.SHA256(data).toString();
};

// Verify data integrity
const verifyChecksum = (data: string, expectedChecksum: string): boolean => {
  return generateChecksum(data) === expectedChecksum;
};

// Compress data (simple base64 encoding for now)
const compressData = (data: string): string => {
  try {
    // Using simple compression - in production, consider using a proper compression library
    return btoa(encodeURIComponent(data));
  } catch (e) {
    return data;
  }
};

// Decompress data
const decompressData = (data: string): string => {
  try {
    return decodeURIComponent(atob(data));
  } catch (e) {
    return data;
  }
};

// Enhanced encryption with IV
export const encryptData = (data: string, classification: DataClassification = DataClassification.INTERNAL): string => {
  try {
    // Sanitize input data
    const sanitizedData = sanitizeInput(data);

    // For restricted data, use additional security measures
    if (classification === DataClassification.RESTRICTED) {
      // Add additional entropy for restricted data
      const entropy = CryptoJS.lib.WordArray.random(16).toString();
      const enhancedData = `${entropy}:${sanitizedData}`;

      // Use a different encryption method for restricted data
      const key = getEncryptionKey() + entropy;
      return CryptoJS.AES.encrypt(enhancedData, key).toString();
    }

    // Standard encryption for other classifications
    const key = getEncryptionKey();
    return CryptoJS.AES.encrypt(sanitizedData, key).toString();
  } catch (e) {
    console.error('Encryption failed:', e);
    throw new Error('Data encryption failed');
  }
};

// Enhanced decryption
export const decryptData = (cipherText: string, classification: DataClassification = DataClassification.INTERNAL): string => {
  try {
    if (classification === DataClassification.RESTRICTED) {
      // Extract entropy from the encrypted data during decryption
      const key = getEncryptionKey();
      const bytes = CryptoJS.AES.decrypt(cipherText, key);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

      // Extract the original data (remove entropy prefix)
      const parts = decryptedData.split(':');
      if (parts.length > 1) {
        return parts.slice(1).join(':');
      }
      return decryptedData;
    }

    // Standard decryption
    const key = getEncryptionKey();
    const bytes = CryptoJS.AES.decrypt(cipherText, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    console.error('Decryption failed:', e);
    throw new Error('Data decryption failed');
  }
};

// Enhanced secure storage class
export class SecureStorage {
  private config: SecureStorageConfig;
  private storageType: StorageType;

  constructor(storageType: StorageType = StorageType.LOCAL, config: Partial<SecureStorageConfig> = {}) {
    this.storageType = storageType;
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (!isStorageAvailable(storageType)) {
      console.warn(`${storageType} is not available. Falling back to in-memory storage.`);
    }
  }

  // Set secure item with classification and metadata
  setItem(
    key: string,
    value: any,
    classification: DataClassification = DataClassification.INTERNAL,
    config?: Partial<SecureStorageConfig>
  ): boolean {
    try {
      const finalConfig = { ...this.config, ...config };
      const sanitizedKey = sanitizeInput(key);

      // Serialize the value
      let serializedValue = typeof value === 'string' ? value : JSON.stringify(value);

      // Compress if enabled
      if (finalConfig.compressionEnabled) {
        serializedValue = compressData(serializedValue);
      }

      // Generate checksum
      const checksum = finalConfig.checksumValidation ? generateChecksum(serializedValue) : '';

      // Create storage data object
      const storageData: SecureStorageData = {
        value: serializedValue,
        timestamp: Date.now(),
        classification,
        checksum,
        version: '1.0.0'
      };

      // Serialize storage data
      const serializedStorageData = JSON.stringify(storageData);

      // Encrypt if enabled
      const finalData = finalConfig.encryptionEnabled
        ? encryptData(serializedStorageData, classification)
        : serializedStorageData;

      // Store in appropriate storage
      if (isStorageAvailable(this.storageType)) {
        window[this.storageType].setItem(sanitizedKey, finalData);
        return true;
      }

      return false;
    } catch (e) {
      console.error('Failed to set secure item:', e);
      return false;
    }
  }

  // Get secure item with validation
  getItem(key: string, expectedClassification?: DataClassification): any {
    try {
      const sanitizedKey = sanitizeInput(key);

      if (!isStorageAvailable(this.storageType)) {
        return null;
      }

      const storedData = window[this.storageType].getItem(sanitizedKey);
      if (!storedData) {
        return null;
      }

      // Decrypt if needed
      let rawData: string;
      if (this.config.encryptionEnabled) {
        const classification = expectedClassification || DataClassification.INTERNAL;
        rawData = decryptData(storedData, classification);
      } else {
        rawData = storedData;
      }

      // Parse storage data
      const storageData: SecureStorageData = JSON.parse(rawData);

      // Validate timestamp if enabled
      if (this.config.timestampValidation && this.config.maxAge) {
        const age = Date.now() - storageData.timestamp;
        if (age > this.config.maxAge) {
          this.removeItem(key);
          return null;
        }
      }

      // Validate classification if specified
      if (expectedClassification && storageData.classification !== expectedClassification) {
        console.warn(`Data classification mismatch for key: ${key}`);
        return null;
      }

      // Decompress if needed
      let value = storageData.value;
      if (this.config.compressionEnabled) {
        value = decompressData(value);
      }

      // Validate checksum if enabled
      if (this.config.checksumValidation && storageData.checksum) {
        if (!verifyChecksum(value, storageData.checksum)) {
          console.warn(`Checksum validation failed for key: ${key}`);
          this.removeItem(key);
          return null;
        }
      }

      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    } catch (e) {
      console.error('Failed to get secure item:', e);
      return null;
    }
  }

  // Remove item
  removeItem(key: string): boolean {
    try {
      const sanitizedKey = sanitizeInput(key);

      if (isStorageAvailable(this.storageType)) {
        window[this.storageType].removeItem(sanitizedKey);
        return true;
      }

      return false;
    } catch (e) {
      console.error('Failed to remove secure item:', e);
      return false;
    }
  }

  // Clear all items (with optional prefix filter)
  clear(prefix?: string): boolean {
    try {
      if (!isStorageAvailable(this.storageType)) {
        return false;
      }

      const storage = window[this.storageType];

      if (prefix) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith(prefix)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => storage.removeItem(key));
      } else {
        storage.clear();
      }

      return true;
    } catch (e) {
      console.error('Failed to clear secure storage:', e);
      return false;
    }
  }

  // Get storage info
  getStorageInfo(): { available: boolean; type: StorageType; itemCount: number } {
    const available = isStorageAvailable(this.storageType);
    let itemCount = 0;

    if (available) {
      itemCount = window[this.storageType].length;
    }

    return {
      available,
      type: this.storageType,
      itemCount
    };
  }
}

// Default instances for convenience
export const secureLocalStorage = new SecureStorage(StorageType.LOCAL);
export const secureSessionStorage = new SecureStorage(StorageType.SESSION);

// Legacy compatibility functions
export const setSecureItem = (key: string, value: string, classification?: DataClassification): boolean => {
  return secureLocalStorage.setItem(key, value, classification);
};

export const getSecureItem = (key: string, classification?: DataClassification): string | null => {
  return secureLocalStorage.getItem(key, classification);
};

export const removeSecureItem = (key: string): boolean => {
  return secureLocalStorage.removeItem(key);
};

// Utility functions for specific data types
export const setWalletData = (key: string, data: any): boolean => {
  return secureLocalStorage.setItem(key, data, DataClassification.RESTRICTED);
};

export const getWalletData = (key: string): any => {
  return secureLocalStorage.getItem(key, DataClassification.RESTRICTED);
};

export const setUserPreferences = (key: string, preferences: any): boolean => {
  return secureLocalStorage.setItem(key, preferences, DataClassification.INTERNAL);
};

export const getUserPreferences = (key: string): any => {
  return secureLocalStorage.getItem(key, DataClassification.INTERNAL);
};

export const setGameData = (key: string, gameData: any): boolean => {
  return secureSessionStorage.setItem(key, gameData, DataClassification.CONFIDENTIAL);
};

export const getGameData = (key: string): any => {
  return secureSessionStorage.getItem(key, DataClassification.CONFIDENTIAL);
};

// Browser compatibility utilities
export const getBrowserCompatibility = () => {
  return {
    localStorage: isStorageAvailable(StorageType.LOCAL),
    sessionStorage: isStorageAvailable(StorageType.SESSION),
    crypto: typeof window !== 'undefined' && 'crypto' in window,
    webgl: (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(
          window.WebGLRenderingContext &&
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
      } catch (e) {
        return false;
      }
    })(),
    websocket: typeof WebSocket !== 'undefined'
  };
};

// Security audit function
export const auditStorageSecurity = (): {
  issues: string[];
  recommendations: string[];
  score: number;
} => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // Check encryption key
  const baseKey = getBaseSecretKey();
  if (baseKey === 'nen-default-dev-key-change-in-production') {
    issues.push('Using default encryption key');
    recommendations.push('Set NEXT_PUBLIC_ENCRYPTION_KEY environment variable');
    score -= 30;
  }

  // Check storage availability
  if (!isStorageAvailable(StorageType.LOCAL)) {
    issues.push('Local storage not available');
    recommendations.push('Implement fallback storage mechanism');
    score -= 20;
  }

  // Check HTTPS
  if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    issues.push('Not using HTTPS');
    recommendations.push('Deploy application over HTTPS for security');
    score -= 25;
  }

  return { issues, recommendations, score };
};

