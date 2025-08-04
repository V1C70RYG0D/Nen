"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTestRedisClient = getTestRedisClient;
exports.getTestDatabaseClient = getTestDatabaseClient;
exports.getTestSolanaConnection = getTestSolanaConnection;
exports.setupTestEnvironment = setupTestEnvironment;
exports.cleanupTestEnvironment = cleanupTestEnvironment;
exports.validateTestEnvironment = validateTestEnvironment;
process.env.NODE_ENV = process.env.TEST_NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.TEST_JWT_SECRET || 'test-jwt-secret-for-testing-only-not-production';
process.env.TEST_SOLANA_RPC_URL = process.env.TEST_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
process.env.SOLANA_RPC_URL = process.env.TEST_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
if (!process.env.REDIS_URL && !process.env.TEST_REDIS_URL && !process.env.DEFAULT_TEST_REDIS_URL) {
    throw new Error('REDIS_URL, TEST_REDIS_URL, or DEFAULT_TEST_REDIS_URL must be set in environment variables. GI-18: No hardcoded values allowed.');
}
process.env.REDIS_URL = process.env.TEST_REDIS_URL || process.env.DEFAULT_TEST_REDIS_URL;
process.env.LOG_LEVEL = process.env.TEST_LOG_LEVEL || 'error';
if (!process.env.ALLOWED_ORIGINS && !process.env.DEFAULT_TEST_ALLOWED_ORIGINS) {
    throw new Error('ALLOWED_ORIGINS or DEFAULT_TEST_ALLOWED_ORIGINS must be set in environment variables. GI-18: No hardcoded values allowed.');
}
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || process.env.DEFAULT_TEST_ALLOWED_ORIGINS;
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
if (!process.env.FRONTEND_URL && !process.env.DEFAULT_TEST_FRONTEND_URL) {
    throw new Error('FRONTEND_URL or DEFAULT_TEST_FRONTEND_URL must be set in environment variables. GI-18: No hardcoded values allowed.');
}
process.env.FRONTEND_URL = process.env.FRONTEND_URL || process.env.DEFAULT_TEST_FRONTEND_URL;
const redisMock_1 = require("./mocks/redisMock");
const databaseMock_1 = require("./mocks/databaseMock");
let mockRedisClient;
let mockDatabaseClient;
let mockSolanaConnection;
function getTestRedisClient() {
    if (!mockRedisClient) {
        mockRedisClient = (0, redisMock_1.createMockRedisClient)();
    }
    return mockRedisClient;
}
function getTestDatabaseClient() {
    if (!mockDatabaseClient) {
        mockDatabaseClient = (0, databaseMock_1.createMockDatabaseClient)();
    }
    return mockDatabaseClient;
}
function getTestSolanaConnection() {
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
async function setupTestEnvironment() {
    validateTestEnvironment();
    mockRedisClient = (0, redisMock_1.createMockRedisClient)();
    mockDatabaseClient = (0, databaseMock_1.createMockDatabaseClient)();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error';
}
async function cleanupTestEnvironment() {
    if (mockRedisClient) {
        await mockRedisClient.flushall();
    }
    if (mockDatabaseClient) {
        mockDatabaseClient.clearTestData();
    }
    jest.clearAllMocks();
}
function validateTestEnvironment() {
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
//# sourceMappingURL=setup.js.map