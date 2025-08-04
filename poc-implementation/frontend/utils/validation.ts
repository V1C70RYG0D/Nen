// Enhanced Validation utilities for Nen Platform with XSS Protection
import DOMPurify from 'dompurify';
import validator from 'validator';

// Input sanitization configuration
interface SanitizationConfig {
  allowedTags?: string[];
  allowedAttributes?: { [key: string]: string[] };
  stripIgnoreTag?: boolean;
  stripIgnoreTagBody?: string[];
}

const DEFAULT_SANITIZATION_CONFIG: SanitizationConfig = {
  allowedTags: [], // No HTML tags allowed by default
  allowedAttributes: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style']
};

/**
 * Comprehensive input sanitization for XSS prevention
 */
export const sanitizeInput = (
  input: string | undefined | null,
  config: SanitizationConfig = DEFAULT_SANITIZATION_CONFIG
): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // First pass: Remove null bytes and normalize whitespace
  let sanitized = input.replace(/\0/g, '').trim();

  // Second pass: Use DOMPurify for HTML sanitization
  sanitized = DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: config.allowedTags || [],
    ALLOWED_ATTR: Object.keys(config.allowedAttributes || {}),
    FORBID_TAGS: ['script', 'object', 'embed', 'link', 'style', 'img', 'svg'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'style']
  });

  // Third pass: Escape remaining special characters
  sanitized = validator.escape(sanitized);

  return sanitized;
};

/**
 * Sanitize and validate URL parameters
 */
export const sanitizeUrlParam = (param: string | undefined | null): string => {
  if (!param) return '';

  let sanitized = sanitizeInput(param);

  // Additional URL-specific sanitization
  sanitized = sanitized.replace(/[^a-zA-Z0-9_-]/g, '');

  return sanitized;
};

/**
 * Sanitize form data recursively
 */
export const sanitizeFormData = (data: any): any => {
  if (typeof data !== 'object' || data === null) {
    return typeof data === 'string' ? sanitizeInput(data) : data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeFormData);
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    const sanitizedKey = sanitizeInput(key);
    sanitized[sanitizedKey] = sanitizeFormData(value);
  }

  return sanitized;
};

/**
 * Content Security Policy violation detection
 */
export const detectCSPViolation = (content: string): boolean => {
  const dangerousPatterns = [
    /javascript:/i,
    /data:text\/html/i,
    /vbscript:/i,
    /on\w+\s*=/i, // Event handlers
    /<script[^>]*>/i,
    /<iframe[^>]*>/i,
    /<object[^>]*>/i,
    /<embed[^>]*>/i,
    /eval\s*\(/i,
    /expression\s*\(/i
  ];

  return dangerousPatterns.some(pattern => pattern.test(content));
};

/**
 * Enhanced input validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: any;
  securityWarnings?: string[];
}

/**
 * Validate SOL amount with sanitization
 */
export const validateSOLAmount = (amount: string): ValidationResult => {
  // Sanitize input first
  const sanitizedAmount = sanitizeInput(amount).replace(/[^0-9.]/g, '');

  if (!sanitizedAmount || sanitizedAmount.trim() === '') {
    return { isValid: false, error: 'Amount is required' };
  }

  // Detect potential security issues
  const securityWarnings: string[] = [];
  if (detectCSPViolation(amount)) {
    securityWarnings.push('Potentially malicious content detected in amount');
  }

  const numValue = parseFloat(sanitizedAmount);

  if (isNaN(numValue)) {
    return { isValid: false, error: 'Invalid number format', securityWarnings };
  }

  if (numValue <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0', securityWarnings };
  }

  if (numValue > 1000000) {
    return { isValid: false, error: 'Amount too large', securityWarnings };
  }

  // Check for too many decimal places
  const decimalPlaces = (sanitizedAmount.split('.')[1] || '').length;
  if (decimalPlaces > 9) {
    return { isValid: false, error: 'Too many decimal places (max 9)', securityWarnings };
  }

  return {
    isValid: true,
    sanitizedValue: numValue,
    securityWarnings: securityWarnings.length > 0 ? securityWarnings : undefined
  };
};

/**
 * Validate Solana public key with sanitization
 */
export const validatePublicKey = (key: string): ValidationResult => {
  if (!key) {
    return { isValid: false, error: 'Public key is required' };
  }

  // Sanitize input first
  const sanitizedKey = sanitizeInput(key).replace(/[^1-9A-HJ-NP-Za-km-z]/g, '');

  // Detect potential security issues
  const securityWarnings: string[] = [];
  if (detectCSPViolation(key)) {
    securityWarnings.push('Potentially malicious content detected in public key');
  }

  // Basic validation for Solana public key format
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

  if (!base58Regex.test(sanitizedKey)) {
    return {
      isValid: false,
      error: 'Invalid public key format',
      securityWarnings: securityWarnings.length > 0 ? securityWarnings : undefined
    };
  }

  return {
    isValid: true,
    sanitizedValue: sanitizedKey,
    securityWarnings: securityWarnings.length > 0 ? securityWarnings : undefined
  };
};

/**
 * Validate username with sanitization
 */
export const validateUsername = (username: string): ValidationResult => {
  if (!username) {
    return { isValid: false, error: 'Username is required' };
  }

  // Sanitize input first
  const sanitizedUsername = sanitizeInput(username).replace(/[^a-zA-Z0-9_-]/g, '');

  // Detect potential security issues
  const securityWarnings: string[] = [];
  if (detectCSPViolation(username)) {
    securityWarnings.push('Potentially malicious content detected in username');
  }

  if (sanitizedUsername.length < 3) {
    return {
      isValid: false,
      error: 'Username must be at least 3 characters',
      securityWarnings: securityWarnings.length > 0 ? securityWarnings : undefined
    };
  }

  if (sanitizedUsername.length > 20) {
    return {
      isValid: false,
      error: 'Username must be less than 20 characters',
      securityWarnings: securityWarnings.length > 0 ? securityWarnings : undefined
    };
  }

  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(sanitizedUsername)) {
    return {
      isValid: false,
      error: 'Username can only contain letters, numbers, underscores, and hyphens',
      securityWarnings: securityWarnings.length > 0 ? securityWarnings : undefined
    };
  }

  return {
    isValid: true,
    sanitizedValue: sanitizedUsername,
    securityWarnings: securityWarnings.length > 0 ? securityWarnings : undefined
  };
};

/**
 * Validate bet amount against user balance
 */
export const validateBetAmount = (
  amount: number,
  userBalance: number,
  minBet: number = 0.001
): { isValid: boolean; error?: string } => {
  if (amount < minBet) {
    return { isValid: false, error: `Minimum bet is ${minBet} SOL` };
  }

  if (amount > userBalance) {
    return { isValid: false, error: 'Insufficient balance' };
  }

  return { isValid: true };
};

/**
 * Enhanced HTML sanitization using DOMPurify
 */
export const sanitizeHTML = (
  html: string,
  config: SanitizationConfig = DEFAULT_SANITIZATION_CONFIG
): string => {
  return sanitizeInput(html, config);
};

/**
 * Validate and sanitize rich text content
 */
export const validateRichText = (
  content: string,
  allowedTags: string[] = ['b', 'i', 'u', 'em', 'strong']
): ValidationResult => {
  if (!content) {
    return { isValid: false, error: 'Content is required' };
  }

  const securityWarnings: string[] = [];

  // Check for CSP violations
  if (detectCSPViolation(content)) {
    securityWarnings.push('Potentially malicious content detected');
  }

  // Sanitize with allowed tags
  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: ['class'],
    FORBID_TAGS: ['script', 'object', 'embed', 'link', 'style', 'img', 'svg'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'style']
  });

  return {
    isValid: true,
    sanitizedValue: sanitizedContent,
    securityWarnings: securityWarnings.length > 0 ? securityWarnings : undefined
  };
};

/**
 * Validate email with enhanced security checks
 */
export const validateEmailEnhanced = (email: string): ValidationResult => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  // Sanitize input first
  const sanitizedEmail = sanitizeInput(email).toLowerCase();

  const securityWarnings: string[] = [];
  if (detectCSPViolation(email)) {
    securityWarnings.push('Potentially malicious content detected in email');
  }

  // Use validator.js for robust email validation
  if (!validator.isEmail(sanitizedEmail)) {
    return {
      isValid: false,
      error: 'Invalid email format',
      securityWarnings: securityWarnings.length > 0 ? securityWarnings : undefined
    };
  }

  return {
    isValid: true,
    sanitizedValue: sanitizedEmail,
    securityWarnings: securityWarnings.length > 0 ? securityWarnings : undefined
  };
};

/**
 * Validate move coordinates for Gungi board
 */
export const validateMoveCoordinates = (
  from: [number, number],
  to: [number, number]
): { isValid: boolean; error?: string } => {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;

  // Check if coordinates are within board bounds (9x9)
  if (fromRow < 0 || fromRow > 8 || fromCol < 0 || fromCol > 8) {
    return { isValid: false, error: 'Invalid starting position' };
  }

  if (toRow < 0 || toRow > 8 || toCol < 0 || toCol > 8) {
    return { isValid: false, error: 'Invalid destination position' };
  }

  // Check if move is not to the same position
  if (fromRow === toRow && fromCol === toCol) {
    return { isValid: false, error: 'Cannot move to the same position' };
  }

  return { isValid: true };
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 60000 // 1 minute
  ) {}

  canAttempt(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];

    // Remove attempts outside the time window
    const validAttempts = attempts.filter(time => now - time < this.windowMs);

    if (validAttempts.length >= this.maxAttempts) {
      return false;
    }

    // Add current attempt
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);

    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}
