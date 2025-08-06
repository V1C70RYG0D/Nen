"use strict";
/**
 * Backend Test Setup
 * Configures testing environment for backend services including WebSocket and database mocking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testUtils = exports.cleanup = void 0;
const globals_1 = require("@jest/globals");
// Configure test timeout
globals_1.jest.setTimeout(30000);
// Environment setup
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
}
// Database configuration for tests
process.env.DATABASE_URL = 'sqlite::memory:';
process.env.REDIS_URI = 'redis://localhost:6379';
// WebSocket configuration for tests
process.env.WEBSOCKET_HOST = 'localhost';
process.env.WEBSOCKET_PORT = '3002';
process.env.WEBSOCKET_SECURE = 'false';
// API configuration for tests
process.env.BACKEND_HOST = 'localhost';
process.env.BACKEND_PORT = '3001';
process.env.API_BASE_URL = 'http://localhost:3001';
// Security configuration for tests
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.JWT_EXPIRES_IN = '1h';
// Mock external services
const mockRedisClient = {
    get: globals_1.jest.fn(),
    set: globals_1.jest.fn(),
    del: globals_1.jest.fn(),
    exists: globals_1.jest.fn(),
    expire: globals_1.jest.fn(),
    flushall: globals_1.jest.fn(),
    quit: globals_1.jest.fn(),
    connect: globals_1.jest.fn(),
    disconnect: globals_1.jest.fn(),
    on: globals_1.jest.fn(),
    off: globals_1.jest.fn(),
};
// Mock Socket.IO for WebSocket testing
const mockSocket = {
    id: 'test-socket-id',
    emit: globals_1.jest.fn(),
    on: globals_1.jest.fn(),
    off: globals_1.jest.fn(),
    join: globals_1.jest.fn(),
    leave: globals_1.jest.fn(),
    disconnect: globals_1.jest.fn(),
    connected: true,
    handshake: {
        auth: {},
        headers: {},
        query: {},
    },
};
const mockToChain = {
    emit: globals_1.jest.fn(),
};
const mockIo = {
    emit: globals_1.jest.fn(),
    on: globals_1.jest.fn(),
    off: globals_1.jest.fn(),
    to: globals_1.jest.fn().mockReturnValue(mockToChain),
    in: globals_1.jest.fn().mockReturnValue(mockToChain),
    use: globals_1.jest.fn(),
    engine: {
        generateId: globals_1.jest.fn(() => 'test-socket-id'),
    },
};
// Make mocks available globally for tests
global.mockRedisClient = mockRedisClient;
global.mockSocket = mockSocket;
global.mockIo = mockIo;
// Mock WebSocket for Node.js environment
class MockWebSocket {
    constructor(url) {
        this.onopen = null;
        this.onmessage = null;
        this.onerror = null;
        this.onclose = null;
        this.send = globals_1.jest.fn();
        this.close = globals_1.jest.fn();
        this.addEventListener = globals_1.jest.fn();
        this.removeEventListener = globals_1.jest.fn();
        this.dispatchEvent = globals_1.jest.fn();
        this.url = url;
        this.readyState = 1; // OPEN
        setTimeout(() => {
            if (this.onopen)
                this.onopen({});
        }, 0);
    }
}
MockWebSocket.CONNECTING = 0;
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;
global.WebSocket = MockWebSocket;
// Console mocking for cleaner test output
const originalConsole = global.console;
global.console = {
    ...originalConsole,
    warn: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
    // Uncomment to silence logs during tests
    // log: jest.fn(),
    // info: jest.fn(),
    // debug: jest.fn(),
};
// Cleanup function for test teardown
const cleanup = () => {
    globals_1.jest.clearAllMocks();
    global.console = originalConsole;
};
exports.cleanup = cleanup;
// Global test utilities
exports.testUtils = {
    mockRedisClient,
    mockSocket,
    mockIo,
    cleanup: exports.cleanup,
};
exports.default = exports.testUtils;
//# sourceMappingURL=setup.js.map