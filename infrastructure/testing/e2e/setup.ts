/**
 * End-to-End Test Setup
 * Configures environment for e2e testing.
 */

import '@testing-library/jest-dom';

// Extended timeout for e2e tests
jest.setTimeout(60000);

// Global setup for e2e tests
beforeAll(async () => {
  console.log('Setting up e2e test environment...');
  // Start test servers, initialize browser instances, etc.
});

afterAll(async () => {
  console.log('Tearing down e2e test environment...');
  // Stop servers, close browsers, cleanup resources
});

// Global e2e test utilities
global.e2eUtils = {
  browserConfig: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    slowMo: 50
  },
  testData: {
    validUser: {
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPassword123!'
    },
    validGame: {
      gameType: 'gungi',
      timeControl: '10+5'
    }
  }
};
