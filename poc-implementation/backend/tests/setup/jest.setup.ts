/**
 * Jest Global Setup Configuration
 */

import { config } from 'dotenv';
import path from 'path';
import { toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';

// Load test environment variables
config({ path: path.resolve(process.cwd(), 'config', '.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';

// Configure test timeouts
jest.setTimeout(30000);

// Extend Jest matchers with jest-axe
expect.extend(toHaveNoViolations);

// Mock external services for isolated testing
jest.mock('axios');
jest.mock('socket.io');
jest.mock('ioredis');

// Global test setup
beforeAll(async () => {
  // Initialize test database connections
  console.log('🧪 Setting up test environment...');
});

afterAll(async () => {
  // Clean up test resources
  console.log('🧹 Cleaning up test environment...');
});

// Global error handler for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
