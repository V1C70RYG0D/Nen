import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.test' });

/**
 * Integration Test Configuration for Nen Platform
 * Tests wallet connections, WebSocket communication, and API integrations
 */
export default defineConfig({
  testDir: './specs',
  timeout: 60 * 1000, // 60 seconds for integration tests
  expect: {
    timeout: 10000 // 10 seconds for assertions
  },
  fullyParallel: false, // Sequential execution for integration tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2,
  reporter: [
    ['html', { outputFolder: 'integration-test-results' }],
    ['json', { outputFile: 'integration-test-results.json' }],
    ['junit', { outputFile: 'integration-junit.xml' }],
    ['line']
  ],
  use: {
    baseURL: (() => {
      if (!process.env.FRONTEND_URL && !process.env.DEFAULT_FRONTEND_URL) {
      }
      return process.env.FRONTEND_URL || process.env.DEFAULT_FRONTEND_URL;
    })(),
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    // Additional context options for blockchain testing
    ignoreHTTPSErrors: true,
    bypassCSP: true
  },
  projects: [
    // Desktop browsers for comprehensive testing
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--allow-running-insecure-content',
            '--disable-blink-features=AutomationControlled'
          ]
        }
      }
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'security.tls.insecure_fallback_hosts': 'localhost',
            'network.stricttransportsecurity.preloadlist': false
          }
        }
      }
    },
    // Mobile testing for wallet connections
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--allow-running-insecure-content'
          ]
        }
      }
    }
  ],
  // Global setup and teardown
  globalSetup: require.resolve('./setup/global-setup.ts'),
  globalTeardown: require.resolve('./setup/global-teardown.ts'),

  // Test environment setup
  webServer: [
    {
      command: 'npm run backend:dev',
      url: process.env.BACKEND_URL || process.env.DEFAULT_BACKEND_URL || process.env.TEST_API_BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      cwd: '../backend'
    },
    {
      command: 'npm run frontend:dev',
      url: process.env.FRONTEND_URL || process.env.DEFAULT_FRONTEND_URL || process.env.TEST_FRONTEND_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      cwd: '../frontend'
    }
  ],

  // Test output directories
  outputDir: 'test-results/'
});
