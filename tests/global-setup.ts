import { chromium, FullConfig } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.test' });

/**
 * Global setup for Playwright tests
 * Handles authentication, data preparation, and environment setup
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for Playwright tests...');

  const { baseURL, storageState } = config.projects[0].use;

  // Launch browser for setup operations
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  const page = await context.newPage();

  try {
    // Wait for services to be ready
    console.log('⏳ Waiting for services to be ready...');

    const backendUrl = process.env.BACKEND_URL || (() => {
    })();
    try {
      await page.goto(`${backendUrl}/health`, { timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || process.env.DEFAULT_HEALTH_CHECK_TIMEOUT || (() => {
      })()) });
      console.log('✅ Backend service is ready');
    } catch (error) {
      console.warn('⚠️ Backend health check failed, continuing...');
    }

    const frontendUrl = process.env.FRONTEND_URL || (() => {
    })();
    try {
      await page.goto(frontendUrl, { timeout: parseInt(process.env.FRONTEND_CHECK_TIMEOUT || process.env.DEFAULT_FRONTEND_CHECK_TIMEOUT || (() => {
      })()) });
      console.log('✅ Frontend service is ready');
    } catch (error) {
      console.warn('⚠️ Frontend availability check failed, continuing...');
    }

    // Perform any authentication setup if needed
    if (process.env.TEST_AUTH_REQUIRED === 'true') {
      console.log('🔐 Setting up authentication...');
      await setupAuthentication(page);
    }

    // Setup test data if needed
    if (process.env.SETUP_TEST_DATA === 'true') {
      console.log('📊 Setting up test data...');
      await setupTestData(page);
    }

    // Save storage state for authenticated tests
    if (storageState) {
      await context.storageState({ path: storageState as string });
      console.log(`💾 Saved storage state to: ${storageState}`);
    }

    console.log('✅ Global setup completed successfully');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

/**
 * Setup authentication for tests
 */
async function setupAuthentication(page: any) {
  // This would typically involve:
  // 1. Navigating to login page
  // 2. Entering test credentials
  // 3. Handling wallet connections for Web3 apps
  // 4. Saving authentication state

  try {
    const testUser = process.env.TEST_USER_EMAIL;
    const testPassword = process.env.TEST_USER_PASSWORD;

    if (testUser && testPassword) {
      // Navigate to login page
      await page.goto('/login');

      // Fill in credentials (if traditional auth is used)
      await page.fill('[data-testid="email"]', testUser);
      await page.fill('[data-testid="password"]', testPassword);
      await page.click('[data-testid="login-button"]');

      // Wait for successful login
      await page.waitForURL('/', { timeout: 10000 });

      console.log('✅ Authentication setup completed');
    } else {
      console.log('ℹ️ No test credentials provided, skipping auth setup');
    }
  } catch (error) {
    console.warn('⚠️ Authentication setup failed:', error);
  }
}

/**
 * Setup test data
 */
async function setupTestData(page: any) {
  try {
    // This would typically involve:
    // 1. Creating test users
    // 2. Setting up test game rooms
    // 3. Preparing blockchain test data
    // 4. Initializing smart contracts for testing

    const backendUrl = process.env.BACKEND_URL || (() => {
    })();

    // Example: Create test game room
    await page.request.post(`${backendUrl}/api/test/setup-game-room`, {
      data: {
        roomId: 'test-room-001',
        gameType: 'gungi',
        players: 2,
      },
    });

    console.log('✅ Test data setup completed');
  } catch (error) {
    console.warn('⚠️ Test data setup failed:', error);
  }
}

export default globalSetup;
