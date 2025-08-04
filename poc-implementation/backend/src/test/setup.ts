/**
 * Backend Test Setup
 * Configures testing environment for backend services including WebSocket and database mocking
 */

import { jest } from '@jest/globals';

// Configure test timeout
jest.setTimeout(30000);

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
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  flushall: jest.fn(),
  quit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};

// Mock Socket.IO for WebSocket testing
const mockSocket = {
  id: 'test-socket-id',
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  disconnect: jest.fn(),
  connected: true,
  handshake: {
    auth: {} as { [key: string]: any },
    headers: {} as { [key: string]: any },
    query: {} as { [key: string]: any },
  },
};

const mockToChain = {
  emit: jest.fn(),
};

const mockIo = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  to: jest.fn().mockReturnValue(mockToChain),
  in: jest.fn().mockReturnValue(mockToChain),
  use: jest.fn(),
  engine: {
    generateId: jest.fn(() => 'test-socket-id'),
  },
};

// Make mocks available globally for tests
(global as any).mockRedisClient = mockRedisClient;
(global as any).mockSocket = mockSocket;
(global as any).mockIo = mockIo;

// Mock WebSocket for Node.js environment
class MockWebSocket {
  constructor(url: string) {
    this.url = url;
    this.readyState = 1; // OPEN
    setTimeout(() => {
      if (this.onopen) this.onopen({} as Event);
    }, 0);
  }

  url: string;
  readyState: number;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  send = jest.fn();
  close = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  dispatchEvent = jest.fn();

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
}

global.WebSocket = MockWebSocket as any;

// Console mocking for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  warn: jest.fn(),
  error: jest.fn(),
  // Uncomment to silence logs during tests
  // log: jest.fn(),
  // info: jest.fn(),
  // debug: jest.fn(),
};

// Cleanup function for test teardown
export const cleanup = () => {
  jest.clearAllMocks();
  global.console = originalConsole;
};

// Global test utilities
export const testUtils = {
  mockRedisClient,
  mockSocket,
  mockIo,
  cleanup,
};

export default testUtils;
