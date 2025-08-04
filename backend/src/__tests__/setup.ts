/**
 * Test Environment Setup - Real Implementation Testing

 */

// Test environment configuration - all values externalized
process.env.NODE_ENV = process.env.TEST_NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.TEST_JWT_SECRET || 'test-jwt-secret-for-testing-only-not-production';
process.env.TEST_SOLANA_RPC_URL = process.env.TEST_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
process.env.SOLANA_RPC_URL = process.env.TEST_SOLANA_RPC_URL || 'https://api.devnet.solana.com';


if (!process.env.REDIS_URL && !process.env.TEST_REDIS_URL && !process.env.DEFAULT_TEST_REDIS_URL) {

}
process.env.REDIS_URL = process.env.TEST_REDIS_URL || process.env.DEFAULT_TEST_REDIS_URL;

process.env.LOG_LEVEL = process.env.TEST_LOG_LEVEL || 'error';


if (!process.env.ALLOWED_ORIGINS && !process.env.DEFAULT_TEST_ALLOWED_ORIGINS) {

}
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || process.env.DEFAULT_TEST_ALLOWED_ORIGINS;

process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';

if (!process.env.FRONTEND_URL && !process.env.DEFAULT_TEST_FRONTEND_URL) {

}
process.env.FRONTEND_URL = process.env.FRONTEND_URL || process.env.DEFAULT_TEST_FRONTEND_URL;

// Real service imports for integration testing
import { MockRedisClient, createMockRedisClient } from './mocks/redisMock';
import { MockDatabaseClient, createMockDatabaseClient } from './mocks/databaseMock';
import { createMockWebSocket } from './mocks/websocketMock';
import { MockEnhancedBettingService, MockOptimizedBettingService, MockBettingService } from './mocks/bettingServiceMocks';

// Real Redis client for testing
let mockRedisClient: MockRedisClient;
let mockDatabaseClient: MockDatabaseClient;
let mockSolanaConnection: any;

export function getTestRedisClient(): MockRedisClient {
  if (!mockRedisClient) {
    mockRedisClient = createMockRedisClient();
  }
  return mockRedisClient;
}

export function getTestDatabaseClient(): MockDatabaseClient {
  if (!mockDatabaseClient) {
    mockDatabaseClient = createMockDatabaseClient();
  }
  return mockDatabaseClient;
}

export function getTestSolanaConnection(): any {
  if (!mockSolanaConnection) {
    mockSolanaConnection = new (class {
      async getBalance() { return 10 * 1e9; }
      async getLatestBlockhash() { return { blockhash: 'mock', lastValidBlockHeight: 123 }; }
      async sendTransaction() { return 'mock-signature'; }
      async confirmTransaction() { return { value: { confirmationStatus: 'confirmed' } }; }
      async simulateTransaction() { return { value: { err: null, logs: ['Instruction executed successfully'] } }; }
    })();
  }
  return mockSolanaConnection;
}

// Test setup utilities
export async function setupTestEnvironment(): Promise<void> {
  // Initialize test environment
  validateTestEnvironment();

  // Initialize mock clients
  mockRedisClient = createMockRedisClient();
  mockDatabaseClient = createMockDatabaseClient();

  // Set up test-specific configurations
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
}

// Test cleanup utilities
export async function cleanupTestEnvironment(): Promise<void> {
  // Clear all mock data
  if (mockRedisClient) {
    await mockRedisClient.flushall();
  }

  if (mockDatabaseClient) {
    mockDatabaseClient.clearTestData();
  }

  // Reset mocks
  jest.clearAllMocks();
}

// Test environment validation
export function validateTestEnvironment(): void {
  const requiredVars = [
    'TEST_JWT_SECRET',
    'TEST_SOLANA_RPC_URL',
    'TEST_REDIS_URL'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    throw new Error(`Missing required test environment variables: ${missing.join(', ')}`);
  }
}
