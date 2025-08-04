/**
 * Jest Global Setup
 */

module.exports = async () => {
  // Set up testing environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'sqlite://test.db';

  // Initialize test database or other global resources
  console.log('🧪 Setting up global test environment...');

  // Add any global test setup here
  global.__TEST_START_TIME__ = Date.now();
};
