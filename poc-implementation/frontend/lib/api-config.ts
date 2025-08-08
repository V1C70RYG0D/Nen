/**
 * API Configuration for Nen Platform
 * Centralizes all API endpoints and configuration to eliminate hardcoding
 */

// Environment-based API configuration
const getApiConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Base URLs from environment variables with fallbacks
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
    (isDevelopment ? 'http://localhost:3005' : 'https://api.nen-platform.com');
  
  const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 
    (isDevelopment ? 'ws://localhost:3011' : 'wss://ws.nen-platform.com');
  
  const MAGICBLOCK_RPC = process.env.NEXT_PUBLIC_MAGICBLOCK_RPC || 
    'https://api.magicblock.app/v1/rpc';
  
  const MAGICBLOCK_WS = process.env.NEXT_PUBLIC_MAGICBLOCK_WS || 
    'wss://api.magicblock.app/v1/ws';

  return {
    baseUrl: API_BASE_URL,
    wsUrl: WS_BASE_URL,
    magicBlockRpc: MAGICBLOCK_RPC,
    magicBlockWs: MAGICBLOCK_WS,
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '10000'),
    retryAttempts: parseInt(process.env.NEXT_PUBLIC_API_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.NEXT_PUBLIC_API_RETRY_DELAY || '1000'),
  };
};

export const apiConfig = getApiConfig();

// API Endpoints
export const endpoints = {
  // Match endpoints
  matches: {
    list: '/api/matches',
    active: '/api/matches/active',
    byId: (id: string) => `/api/matches/${id}`,
    create: '/api/matches/create',
    start: (id: string) => `/api/matches/${id}/start`,
    moves: (id: string) => `/api/matches/${id}/moves`,
    history: (id: string) => `/api/matches/${id}/history`,
  },
  
  // User endpoints
  user: {
    bettingAccount: (address: string) => `/api/user/betting-account/${address}`,
    deposit: '/api/user/deposit',
    withdraw: '/api/user/withdraw',
    transactionHistory: (address: string, limit?: number) => 
      `/api/user/transaction-history/${address}${limit ? `?limit=${limit}` : ''}`,
  },
  
  // Betting endpoints
  betting: {
    placeBet: '/api/betting/place',
    getBets: (address: string) => `/api/betting/user/${address}`,
    pool: (matchId: string) => `/api/betting/pool/${matchId}`,
  },
  
  // AI Agent endpoints
  agents: {
    list: '/api/agents',
    byId: (id: string) => `/api/agents/${id}`,
    performance: (id: string) => `/api/agents/${id}/performance`,
    marketplace: '/api/agents/marketplace',
  },
} as const;

// HTTP Client Configuration
export const httpClientConfig = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  credentials: 'include' as RequestCredentials,
} as const;

// WebSocket Configuration
export const wsConfig = {
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  heartbeatInterval: 30000,
  maxReconnectionDelay: 10000,
} as const;

// Rate Limiting Configuration
export const rateLimitConfig = {
  maxRequestsPerMinute: 60,
  burstLimit: 10,
} as const;

// Error Codes and Messages
export const apiErrors = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
} as const;

export const errorMessages = {
  [apiErrors.NETWORK_ERROR]: 'Network connection failed. Please check your internet connection.',
  [apiErrors.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
  [apiErrors.UNAUTHORIZED]: 'Authentication required. Please connect your wallet.',
  [apiErrors.FORBIDDEN]: 'Access denied. You do not have permission to perform this action.',
  [apiErrors.NOT_FOUND]: 'The requested resource was not found.',
  [apiErrors.VALIDATION_ERROR]: 'Invalid input data. Please check your request.',
  [apiErrors.SERVER_ERROR]: 'Server error occurred. Please try again later.',
  [apiErrors.RATE_LIMITED]: 'Too many requests. Please wait before trying again.',
  [apiErrors.WALLET_NOT_CONNECTED]: 'Please connect your wallet to continue.',
} as const;

// Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Query Filters
export interface MatchFilters {
  status?: 'upcoming' | 'live' | 'completed';
  minBetRange?: number;
  maxBetRange?: number;
  minAiRating?: number;
  maxAiRating?: number;
  nenType?: string;
  sortBy?: 'startTime' | 'totalPool' | 'rating';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface AgentFilters {
  nenType?: string;
  minRating?: number;
  maxRating?: number;
  minPrice?: number;
  maxPrice?: number;
  availability?: 'available' | 'training' | 'retired';
  sortBy?: 'rating' | 'price' | 'performance';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Validation helpers
export const validateFilters = {
  matchFilters: (filters: MatchFilters): string[] => {
    const errors: string[] = [];
    
    if (filters.minBetRange !== undefined && filters.minBetRange < 0) {
      errors.push('Minimum bet range must be non-negative');
    }
    
    if (filters.maxBetRange !== undefined && filters.maxBetRange < 0) {
      errors.push('Maximum bet range must be non-negative');
    }
    
    if (filters.minBetRange !== undefined && filters.maxBetRange !== undefined && 
        filters.minBetRange > filters.maxBetRange) {
      errors.push('Minimum bet range cannot be greater than maximum bet range');
    }
    
    if (filters.minAiRating !== undefined && filters.minAiRating < 0) {
      errors.push('Minimum AI rating must be non-negative');
    }
    
    if (filters.maxAiRating !== undefined && filters.maxAiRating < 0) {
      errors.push('Maximum AI rating must be non-negative');
    }
    
    if (filters.minAiRating !== undefined && filters.maxAiRating !== undefined && 
        filters.minAiRating > filters.maxAiRating) {
      errors.push('Minimum AI rating cannot be greater than maximum AI rating');
    }
    
    if (filters.page !== undefined && filters.page < 1) {
      errors.push('Page number must be greater than 0');
    }
    
    if (filters.limit !== undefined && (filters.limit < 1 || filters.limit > 100)) {
      errors.push('Limit must be between 1 and 100');
    }
    
    return errors;
  }
};
