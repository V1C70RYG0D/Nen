const { spawn } = require('child_process');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

/**
 * Global setup for WebSocket tests
 * Starts necessary services and initializes test environment
 */
module.exports = async () => {
  console.log('🚀 Starting WebSocket test environment setup...');

  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.WEBSOCKET_HOST = 'localhost';
  process.env.WEBSOCKET_PORT = '3003';
  process.env.LOAD_TEST_PORT = '3004';
  process.env.SECURITY_TEST_PORT = '3005';
  process.env.REDIS_URI = 'redis://localhost:6379';
  process.env.DATABASE_URL = 'sqlite::memory:';
  process.env.JWT_SECRET = 'test-jwt-secret-for-websocket-testing';

  // Store process IDs for cleanup
  global.__WEBSOCKET_TEST_PROCESSES__ = [];

  try {
    // Start Redis if not running (for local testing)
    console.log('📦 Checking Redis connection...');
    try {
      const redis = require('ioredis');
      const client = new redis(process.env.REDIS_URI);
      await client.ping();
      await client.quit();
      console.log('✅ Redis is available');
    } catch (error) {
      console.warn('⚠️  Redis not available, using mock for tests');
      process.env.USE_MOCK_REDIS = 'true';
    }

    // Initialize test databases
    console.log('🗄️  Initializing test database...');
    
    // Create test directories
    const fs = require('fs');
    const path = require('path');
    
    const dirs = ['results/websocket', 'coverage/websocket', 'logs/websocket'];
    dirs.forEach(dir => {
      const fullPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });

    // Wait a moment for services to stabilize
    await sleep(2000);

    console.log('✅ WebSocket test environment setup complete');

  } catch (error) {
    console.error('❌ Failed to setup WebSocket test environment:', error);
    throw error;
  }
};
