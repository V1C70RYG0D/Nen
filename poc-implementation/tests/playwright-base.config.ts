import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  timeout: process.env.TEST_TIMEOUT_E2E ? parseInt(process.env.TEST_TIMEOUT_E2E) : 30 * 1000,
  expect: {
    timeout: 5000
  },
  fullyParallel: process.env.ENABLE_PARALLEL_TESTS !== 'false',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Global setup and teardown
  globalSetup: path.resolve(__dirname, 'global-setup.ts'),
  globalTeardown: path.resolve(__dirname, 'global-teardown.ts'),

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    process.env.CI ? ['github'] : ['list']
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || (() => {
      throw new Error('PLAYWRIGHT_BASE_URL must be set in environment variables. Environment variables required.');
    })(),

    // API testing configuration
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },

    // Visual testing
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Browser configuration
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // Test data and authentication
    storageState: process.env.PLAYWRIGHT_STORAGE_STATE,

    // Timeouts - externalized configuration
    actionTimeout: parseInt(process.env.PLAYWRIGHT_ACTION_TIMEOUT || process.env.DEFAULT_PLAYWRIGHT_ACTION_TIMEOUT || (() => {
      throw new Error('PLAYWRIGHT_ACTION_TIMEOUT or DEFAULT_PLAYWRIGHT_ACTION_TIMEOUT must be set in environment variables. Environment variables required.');
    })()),
    navigationTimeout: parseInt(process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT || process.env.DEFAULT_PLAYWRIGHT_NAVIGATION_TIMEOUT || (() => {
      throw new Error('PLAYWRIGHT_NAVIGATION_TIMEOUT or DEFAULT_PLAYWRIGHT_NAVIGATION_TIMEOUT must be set in environment variables. Environment variables required.');
    })())
  },

  projects: [
    // Setup project for authentication and data preparation
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup'
    },

    // Cleanup project
    {
      name: 'cleanup',
      testMatch: /.*\.cleanup\.ts/
    },

    // Desktop browsers
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          permissions: ['geolocation', 'notifications']
        }
      },
      dependencies: ['setup']
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup']
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup']
    },

    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup']
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      dependencies: ['setup']
    },

    // API testing project
    {
      name: 'api',
      testMatch: /.*\.api\.spec\.ts/,
      use: {
        baseURL: process.env.TEST_API_BASE_URL || process.env.PLAYWRIGHT_BASE_URL
      },
      dependencies: ['setup']
    }
  ],

  // Web server configuration for local development
  webServer: process.env.CI ? undefined : [
    {
      command: 'npm run backend:dev',
      port: parseInt(process.env.TEST_SERVER_PORT || process.env.DEFAULT_TEST_SERVER_PORT || (() => {
        throw new Error('TEST_SERVER_PORT or DEFAULT_TEST_SERVER_PORT must be set in environment variables. Environment variables required.');
      })()),
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI
    },
    {
      command: 'npm run frontend:dev',
      port: parseInt(process.env.FRONTEND_PORT || process.env.DEFAULT_FRONTEND_PORT || (() => {
        throw new Error('FRONTEND_PORT or DEFAULT_FRONTEND_PORT must be set in environment variables. Environment variables required.');
      })()),
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI
    }
  ]
});
