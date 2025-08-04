"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testUtils = exports.cleanup = void 0;
const globals_1 = require("@jest/globals");
globals_1.jest.setTimeout(30000);
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
}
process.env.DATABASE_URL = 'sqlite::memory:';
process.env.REDIS_URI = 'redis://localhost:6379';
process.env.WEBSOCKET_HOST = 'localhost';
process.env.WEBSOCKET_PORT = '3002';
process.env.WEBSOCKET_SECURE = 'false';
process.env.BACKEND_HOST = 'localhost';
process.env.BACKEND_PORT = '3001';
process.env.API_BASE_URL = 'http://localhost:3001';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.JWT_EXPIRES_IN = '1h';
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
global.mockRedisClient = mockRedisClient;
global.mockSocket = mockSocket;
global.mockIo = mockIo;
class MockWebSocket {
    constructor(url) {
        this.url = url;
        this.readyState = 1;
        setTimeout(() => {
            if (this.onopen)
                this.onopen({});
        }, 0);
    }
    url;
    readyState;
    onopen = null;
    onmessage = null;
    onerror = null;
    onclose = null;
    send = globals_1.jest.fn();
    close = globals_1.jest.fn();
    addEventListener = globals_1.jest.fn();
    removeEventListener = globals_1.jest.fn();
    dispatchEvent = globals_1.jest.fn();
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
}
global.WebSocket = MockWebSocket;
const originalConsole = global.console;
global.console = {
    ...originalConsole,
    warn: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
};
const cleanup = () => {
    globals_1.jest.clearAllMocks();
    global.console = originalConsole;
};
exports.cleanup = cleanup;
exports.testUtils = {
    mockRedisClient,
    mockSocket,
    mockIo,
    cleanup: exports.cleanup,
};
exports.default = exports.testUtils;
//# sourceMappingURL=setup.js.map