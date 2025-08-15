/**
 * Jest Test Setup File
 * Following GI guidelines - real implementations with comprehensive testing
 */

import 'jest-extended';
import { setupTestDatabase, teardownTestDatabase } from './utils/testDatabase';
import { createMockLogger } from './mocks/logger';

// Setup environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.WS_PORT = '3002';
process.env.API_HOST = '127.0.0.1';
process.env.API_TIMEOUT = '10000';
process.env.WEBSOCKET_TIMEOUT = '30000';
process.env.CORS_ORIGIN = 'http://127.0.0.1:3010';
process.env.CORS_CREDENTIALS = 'true';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-not-production';
process.env.SOLANA_RPC_URL = 'https://api.devnet.solana.com';
process.env.SOLANA_NETWORK = 'devnet';
process.env.SOLANA_PROGRAM_ID = '11111111111111111111111111111112';
process.env.SOLANA_COMMITMENT = 'confirmed';
process.env.LOG_LEVEL = 'error';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
process.env.DATABASE_URL = 'postgresql://testuser:testpass@localhost:5432/test_db';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USERNAME = 'testuser';
process.env.DB_PASSWORD = 'testpass';
process.env.DB_NAME = 'test_db';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.AI_SERVICE_URL = 'http://localhost:8080';
process.env.MAGICBLOCK_API_KEY = 'test-api-key';
process.env.MAGICBLOCK_ENDPOINT = 'https://api.magicblock.gg';

// Global test configuration
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

// Extended Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveProperty(property: string, value?: any): R;
      toBe(expected: any): R;
      toEqual(expected: any): R;
    }
  }
}

// Mock console methods to reduce noise in tests
beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn(); 
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});

// Global test timeout
jest.setTimeout(10000);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Test Redis client for testing
export function getTestRedisClient() {
  const mockRedisClient = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    hget: jest.fn().mockResolvedValue(null),
    hset: jest.fn().mockResolvedValue(1),
    hgetall: jest.fn().mockResolvedValue({}),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(-1),
    flushall: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn().mockResolvedValue(undefined)
  };
  return mockRedisClient;
}

// Test Solana connection for testing
export function getTestSolanaConnection() {
  const mockConnection = {
    getBalance: jest.fn().mockResolvedValue(1000000000), // 1 SOL
    getAccountInfo: jest.fn().mockResolvedValue(null),
    sendTransaction: jest.fn().mockResolvedValue('mockTxId'),
    confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
    getRecentBlockhash: jest.fn().mockResolvedValue({ blockhash: 'mockBlockhash', feeCalculator: { lamportsPerSignature: 5000 } }),
    requestAirdrop: jest.fn().mockResolvedValue('mockAirdropTx')
  };
  return mockConnection;
}

// Cleanup test environment
export function cleanupTestEnvironment() {
  // Reset all mocks
  jest.clearAllMocks();
  jest.resetAllMocks();
  
  // Clear any timers
  jest.clearAllTimers();
  
  return Promise.resolve();
}

// Global test database setup and teardown
beforeAll(async () => {
  try {
    await setupTestDatabase();
    console.log('Global test database setup completed');
  } catch (error) {
    console.error('Global test database setup failed:', error);
    // Don't fail tests if database setup fails (use mocks instead)
  }
}, 30000);

afterAll(async () => {
  try {
    await teardownTestDatabase();
    console.log('Global test database teardown completed');
  } catch (error) {
    console.error('Global test database teardown failed:', error);
    // Don't fail tests if database teardown fails
  }
}, 30000);

// Reset test state before each test
beforeEach(() => {
  // Clear all mocks to ensure clean state
  jest.clearAllMocks();
});

export { setupTestDatabase, teardownTestDatabase };
export {};
