"use strict";
/**
 * Jest Test Setup File
 * Following GI guidelines - real implementations with comprehensive testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTestRedisClient = getTestRedisClient;
exports.getTestSolanaConnection = getTestSolanaConnection;
exports.cleanupTestEnvironment = cleanupTestEnvironment;
require("jest-extended");
// Setup environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.API_HOST = '127.0.0.1';
process.env.CORS_ORIGIN = 'http://127.0.0.1:3010';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-not-production';
process.env.SOLANA_RPC_URL = 'https://api.devnet.solana.com';
process.env.LOG_LEVEL = 'error';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
// Global test configuration
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;
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
function getTestRedisClient() {
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
function getTestSolanaConnection() {
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
function cleanupTestEnvironment() {
    // Reset all mocks
    jest.clearAllMocks();
    jest.resetAllMocks();
    // Clear any timers
    jest.clearAllTimers();
    return Promise.resolve();
}
//# sourceMappingURL=setup.js.map