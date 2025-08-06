import { defineConfig, devices, PlaywrightTestConfig } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

/**
 * Comprehensive Playwright Test Configuration
 * Covers complete browser compatibility matrix for cross-platform testing
 *
 * Browser Coverage:
 * - Desktop: Chrome, Firefox, Safari, Edge
 * - Mobile: iOS Safari, Android Chrome
 * - Tablets: iPad, Android tablets
 * - Different screen sizes and resolutions
 * - Accessibility testing configurations
 */

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results/playwright',

  // Test execution configuration
  timeout: process.env.TEST_TIMEOUT_E2E ? parseInt(process.env.TEST_TIMEOUT_E2E) : 60 * 1000,
  expect: {
    timeout: parseInt(process.env.PLAYWRIGHT_EXPECT_TIMEOUT || '10000')
  },

  // Parallel execution settings
  fullyParallel: process.env.ENABLE_PARALLEL_TESTS !== 'false',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 1,
  workers: process.env.CI ? 2 : Math.min(4, require('os').cpus().length),

  // Global setup and teardown
  globalSetup: path.resolve(__dirname, 'tests/global-setup.ts'),
  globalTeardown: path.resolve(__dirname, 'tests/global-teardown.ts'),

  // Comprehensive reporting
  reporter: [
    ['html', {
      outputFolder: 'playwright-report',
      open: process.env.CI ? 'never' : 'on-failure'
    }],
    ['json', { outputFile: 'test-results/playwright/results.json' }],
    ['junit', { outputFile: 'test-results/playwright/junit.xml' }],
    ['allure-playwright', {
      outputFolder: 'test-results/playwright/allure-results',
      suiteTitle: 'Nen Platform Cross-Browser Tests'
    }],
    process.env.CI ? ['github'] : ['list', { printSteps: true }]
  ],

  // Base configuration
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || (() => {
    })(),

    // Network and API configuration
    extraHTTPHeaders: {
      'Accept': 'application/json, text/html, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'User-Agent': 'Nen-Platform-E2E-Tests/1.0'
    },

    // Visual testing and debugging
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    video: {
      mode: 'retain-on-failure',
      size: { width: 1280, height: 720 }
    },

    // Default viewport (will be overridden per project)
    viewport: { width: 1280, height: 720 },

    // Security and performance
    ignoreHTTPSErrors: true,
    bypassCSP: false,

    // Authentication state
    storageState: process.env.PLAYWRIGHT_STORAGE_STATE,

    // Timeouts - GI-18 Compliant: Externalized configuration
    actionTimeout: parseInt(process.env.PLAYWRIGHT_ACTION_TIMEOUT || '15000'),
    navigationTimeout: parseInt(process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT || '45000'),

    // Locale and timezone
    locale: 'en-US',
    timezoneId: 'America/New_York',

    // Color scheme testing
    colorScheme: 'light',  // Will be overridden in specific projects

    // Accessibility settings
    reducedMotion: 'no-preference',
    forcedColors: 'none'
  },

  // Comprehensive browser and device matrix
  projects: [
    // === SETUP AND TEARDOWN PROJECTS ===
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup'
    },
    {
      name: 'cleanup',
      testMatch: /.*\.cleanup\.ts/
    },

    // === DESKTOP BROWSERS - LATEST VERSIONS ===
    {
      name: 'desktop-chrome-latest',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        contextOptions: {
          permissions: ['geolocation', 'notifications', 'camera', 'microphone']
        }
      },
      dependencies: ['setup']
    },
    {
      name: 'desktop-firefox-latest',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup']
    },
    {
      name: 'desktop-safari-latest',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup']
    },
    {
      name: 'desktop-edge-latest',
      use: {
        ...devices['Desktop Edge'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup']
    },
    // Tablet Landscape Mode
    {
      name: 'ipad-landscape',
      use: {
        ...devices['iPad Pro 11'],
        viewport: { width: 1024, height: 768 }
      },
      dependencies: ['setup']
    },
    // Tablet Portrait Mode
    {
      name: 'ipad-portrait',
      use: {
        ...devices['iPad Pro 11'],
        viewport: { width: 768, height: 1024 }
      },
      dependencies: ['setup']
    },
    // High DPI Display
    {
      name: 'desktop-chrome-high-dpi',
      use: {
        ...devices['Desktop Chrome'],
        deviceScaleFactor: 2
      }
    },

    // === DESKTOP BROWSERS - DIFFERENT RESOLUTIONS ===
    {
      name: 'desktop-chrome-1366x768',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 }
      },
      dependencies: ['setup']
    },
    {
      name: 'desktop-chrome-1440x900',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 }
      },
      dependencies: ['setup']
    },
    {
      name: 'desktop-chrome-2560x1440',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 2560, height: 1440 }
      },
      dependencies: ['setup']
    },

    // === MOBILE DEVICES - iOS ===
    {
      name: 'iphone-12',
      use: { ...devices['iPhone 12'] },
      dependencies: ['setup']
    },
    {
      name: 'iphone-12-pro',
      use: { ...devices['iPhone 12 Pro'] },
      dependencies: ['setup']
    },
    {
      name: 'iphone-13',
      use: { ...devices['iPhone 13'] },
      dependencies: ['setup']
    },
    {
      name: 'iphone-13-pro',
      use: { ...devices['iPhone 13 Pro'] },
      dependencies: ['setup']
    },
    {
      name: 'iphone-14',
      use: { ...devices['iPhone 14'] },
      dependencies: ['setup']
    },
    {
      name: 'iphone-se',
      use: { ...devices['iPhone SE'] },
      dependencies: ['setup']
    },

    // === MOBILE DEVICES - Android ===
    {
      name: 'pixel-5',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup']
    },
    {
      name: 'pixel-7',
      use: { ...devices['Pixel 7'] },
      dependencies: ['setup']
    },
    {
      name: 'galaxy-s9-plus',
      use: { ...devices['Galaxy S9+'] },
      dependencies: ['setup']
    },
    {
      name: 'galaxy-note-2',
      use: { ...devices['Galaxy Note II'] },
      dependencies: ['setup']
    },
    {
      name: 'galaxy-tab-s4',
      use: { ...devices['Galaxy Tab S4'] },
      dependencies: ['setup']
    },

    // === TABLET DEVICES ===
    {
      name: 'ipad-air',
      use: { ...devices['iPad Air'] },
      dependencies: ['setup']
    },
    {
      name: 'ipad-gen-7',
      use: { ...devices['iPad (gen 7)'] },
      dependencies: ['setup']
    },
    {
      name: 'ipad-mini',
      use: { ...devices['iPad Mini'] },
      dependencies: ['setup']
    },
    {
      name: 'ipad-pro-11',
      use: { ...devices['iPad Pro 11'] },
      dependencies: ['setup']
    },

    // === ACCESSIBILITY TESTING ===
    {
      name: 'accessibility-high-contrast',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        forcedColors: 'active',
        reducedMotion: 'reduce'
      },
      dependencies: ['setup']
    },
    {
      name: 'accessibility-reduced-motion',
      use: {
        ...devices['Desktop Chrome'],
        reducedMotion: 'reduce'
      },
      dependencies: ['setup']
    },
    {
      name: 'accessibility-screen-reader',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          permissions: ['accessibility-events']
        }
      },
      dependencies: ['setup']
    },

    // === DARK MODE TESTING ===
    {
      name: 'desktop-chrome-dark',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark'
      },
      dependencies: ['setup']
    },
    {
      name: 'mobile-safari-dark',
      use: {
        ...devices['iPhone 12'],
        colorScheme: 'dark'
      },
      dependencies: ['setup']
    },

    // === NETWORK CONDITIONS TESTING ===
    {
      name: 'slow-3g-mobile',
      use: {
        ...devices['Pixel 5'],
        contextOptions: {
          offline: false,
          downloadThroughput: 500 * 1024 / 8, // 500kbps
          uploadThroughput: 500 * 1024 / 8,
          latency: 300 // 300ms
        }
      },
      dependencies: ['setup']
    },
    {
      name: 'fast-3g-mobile',
      use: {
        ...devices['iPhone 12'],
        contextOptions: {
          offline: false,
          downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6Mbps
          uploadThroughput: 750 * 1024 / 8, // 750kbps
          latency: 150 // 150ms
        }
      },
      dependencies: ['setup']
    },

    // === API TESTING PROJECT ===
    {
      name: 'api-tests',
      testMatch: /.*\.api\.spec\.ts/,
      use: {
        baseURL: process.env.TEST_API_BASE_URL || process.env.PLAYWRIGHT_BASE_URL,
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Nen-Platform-API-Tests/1.0'
        }
      },
      dependencies: ['setup']
    },

    // === PERFORMANCE TESTING ===
    {
      name: 'performance-desktop',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          recordHar: {
            path: 'test-results/playwright/performance-desktop.har',
            mode: 'minimal'
          }
        }
      },
      dependencies: ['setup']
    },
    {
      name: 'performance-mobile',
      use: {
        ...devices['Pixel 5'],
        contextOptions: {
          recordHar: {
            path: 'test-results/playwright/performance-mobile.har',
            mode: 'minimal'
          }
        }
      },
      dependencies: ['setup']
    },

    // === VISUAL REGRESSION TESTING ===
    {
      name: 'visual-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
      dependencies: ['setup']
    },
    {
      name: 'visual-firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 }
      },
      dependencies: ['setup']
    },
    {
      name: 'visual-safari',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 }
      },
      dependencies: ['setup']
    }
  ],

  // Web server configuration for local development
  webServer: process.env.CI ? undefined : [
    {
      command: 'npm run backend:dev',
      port: parseInt(process.env.TEST_SERVER_PORT || '3001'),
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'test',
        ...process.env
      }
    },
    {
      command: 'npm run frontend:dev',
      port: parseInt(process.env.FRONTEND_PORT || '3000'),
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      cwd: './frontend',
      env: {
        NODE_ENV: 'test',
        ...process.env
      }
    }
  ],

  // Test result and artifact management
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/coverage/**'
  ]
});
