/**
 * Integration Test Setup
 * Configures environment for integration testing.
 */

import '@testing-library/jest-dom';

// Extended timeout for integration tests
jest.setTimeout(30000);

// Global setup for integration tests
beforeAll(async () => {
  // Initialize test database connections
  console.log('Setting up integration test environment...');
});

afterAll(async () => {
  // Cleanup test resources
  console.log('Tearing down integration test environment...');
});

// Mock external services for integration tests
global.mockServices = {
  database: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    query: jest.fn()
  },
  redis: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn()
  }
};
