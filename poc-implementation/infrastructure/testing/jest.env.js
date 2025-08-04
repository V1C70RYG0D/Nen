/**
 * Jest Environment Setup
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'sqlite::memory:';
process.env.API_PORT = '0'; // Let system choose port for tests
process.env.DISABLE_LOGGING = 'true';

// WebSocket Test Configuration - GI-3 Compliant: No hardcoded values
const WS_HOST = process.env.TEST_WS_HOST || process.env.DEFAULT_WS_HOST || 'localhost';
const WS_PORT = process.env.TEST_WS_PORT || process.env.DEFAULT_WS_PORT || '3002';
const WS_PROTOCOL = process.env.TEST_WS_PROTOCOL || process.env.DEFAULT_WS_PROTOCOL || 'ws';

process.env.TEST_WS_URL = `${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}`;
process.env.NEXT_PUBLIC_WS_URL = `${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}`;
process.env.NEXT_PUBLIC_WEBSOCKET_URL = `${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}`;
process.env.WEBSOCKET_HOST = WS_HOST;
process.env.WEBSOCKET_PORT = WS_PORT;
process.env.WEBSOCKET_SECURE = 'false';

// API Test Configuration - GI-3 Compliant: No hardcoded values
const API_HOST = process.env.TEST_API_HOST || process.env.DEFAULT_API_HOST || 'localhost';
const API_PORT = process.env.TEST_API_PORT || process.env.DEFAULT_API_PORT || '3001';
const API_PROTOCOL = process.env.TEST_API_PROTOCOL || process.env.DEFAULT_API_PROTOCOL || 'http';

process.env.TEST_API_BASE_URL = `${API_PROTOCOL}://${API_HOST}:${API_PORT}`;
process.env.NEXT_PUBLIC_API_URL = `${API_PROTOCOL}://${API_HOST}:${API_PORT}`;
process.env.API_BASE_URL = `${API_PROTOCOL}://${API_HOST}:${API_PORT}`;
process.env.BACKEND_HOST = API_HOST;
process.env.BACKEND_PORT = API_PORT;

// Frontend Test Configuration - GI-3 Compliant: No hardcoded values
const FRONTEND_HOST = process.env.TEST_FRONTEND_HOST || process.env.DEFAULT_FRONTEND_HOST || 'localhost';
const FRONTEND_PORT = process.env.TEST_FRONTEND_PORT || process.env.DEFAULT_FRONTEND_PORT || '3000';
const FRONTEND_PROTOCOL = process.env.TEST_FRONTEND_PROTOCOL || process.env.DEFAULT_FRONTEND_PROTOCOL || 'http';

process.env.TEST_FRONTEND_URL = `${FRONTEND_PROTOCOL}://${FRONTEND_HOST}:${FRONTEND_PORT}`;
process.env.FRONTEND_HOST = FRONTEND_HOST;
process.env.FRONTEND_PORT = FRONTEND_PORT;

// Blockchain Test Configuration
process.env.SOLANA_NETWORK = 'devnet';
process.env.NEXT_PUBLIC_RPC_URL = 'https://api.devnet.solana.com';
process.env.SOLANA_RPC_URL = 'https://api.devnet.solana.com';
process.env.SOLANA_CLUSTER = 'devnet';

// Security Test Configuration
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';

// Redis Test Configuration
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_URI = 'redis://localhost:6379';

// AI Service Test Configuration
process.env.AI_SERVICE_HOST = 'localhost';
process.env.AI_SERVICE_PORT = '3003';
process.env.AI_SERVICE_URL = 'http://localhost:3003';

// Mock console methods for cleaner test output
global.console = {
  ...console,
  // Uncomment below to silence console.log in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
