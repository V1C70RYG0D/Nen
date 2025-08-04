import { test as setup, expect } from '@playwright/test';
import path from 'path';

/**
 * Usability Testing Setup
 * Prepares test environment for comprehensive user journey testing
 *
 * GI-18 Compliant: All configurations externalized via environment variables
 */

const STORAGE_STATE_PATH = process.env.PLAYWRIGHT_STORAGE_STATE || 'tests/auth/user.json';
const ADMIN_STORAGE_STATE_PATH = process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE || 'tests/auth/admin.json';

setup('prepare test users and data', async ({ page, context }) => {
  console.log('🚀 Setting up usability testing environment...');

  // Set up viewport for consistent testing
  await page.setViewportSize({ width: 1280, height: 720 });

  // Navigate to application
  const baseURL = process.env.PLAYWRIGHT_BASE_URL;
  if (!baseURL) {
    throw new Error('PLAYWRIGHT_BASE_URL must be set for usability testing');
  }

  await page.goto(baseURL);

  // Wait for application to load
  await page.waitForLoadState('networkidle');

  // Check if application is accessible
  await expect(page).toHaveTitle(/Nen Platform/i);

  console.log('✅ Application loaded successfully');
});

setup('create new user session', async ({ page, context }) => {
  console.log('👤 Creating new user session for onboarding tests...');

  const baseURL = process.env.PLAYWRIGHT_BASE_URL;
  await page.goto(baseURL);

  // Clear any existing storage
  await context.clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Save clean state for new user tests
  await page.context().storageState({
    path: 'tests/auth/new-user.json'
  });

  console.log('✅ New user session created');
});

setup('create authenticated user session', async ({ page, context }) => {
  console.log('🔐 Creating authenticated user session...');

  const baseURL = process.env.PLAYWRIGHT_BASE_URL;
  await page.goto(baseURL);

  // Simulate wallet connection (mock for testing)
  await page.evaluate(() => {
    // Mock wallet connection
    localStorage.setItem('wallet_connected', 'true');
    localStorage.setItem('wallet_address', '0x742d35Cc6638C0532c2D');
    localStorage.setItem('user_authenticated', 'true');
  });

  // Navigate to dashboard to verify authentication
  await page.goto(`${baseURL}/dashboard`);
  await page.waitForLoadState('networkidle');

  // Save authenticated state
  await page.context().storageState({
    path: STORAGE_STATE_PATH
  });

  console.log('✅ Authenticated user session created');
});

setup('create power user session with data', async ({ page, context }) => {
  console.log('⚡ Creating power user session with test data...');

  const baseURL = process.env.PLAYWRIGHT_BASE_URL;
  await page.goto(baseURL);

  // Set up power user with existing bets and portfolio
  await page.evaluate(() => {
    localStorage.setItem('wallet_connected', 'true');
    localStorage.setItem('wallet_address', '0x742d35Cc6638C0532c2D');
    localStorage.setItem('user_authenticated', 'true');
    localStorage.setItem('user_type', 'power_user');

    // Mock existing bets and portfolio data
    const mockBets = [
      {
        id: 'bet_001',
        match_id: 'match_001',
        amount: '100',
        type: 'winner',
        status: 'active',
        created_at: new Date().toISOString()
      },
      {
        id: 'bet_002',
        match_id: 'match_002',
        amount: '250',
        type: 'score',
        status: 'pending',
        created_at: new Date().toISOString()
      }
    ];

    const mockPortfolio = {
      total_value: '2500',
      active_bets: 5,
      win_rate: '68%',
      favorite_games: ['gungi', 'chess']
    };

    localStorage.setItem('user_bets', JSON.stringify(mockBets));
    localStorage.setItem('user_portfolio', JSON.stringify(mockPortfolio));
  });

  // Save power user state
  await page.context().storageState({
    path: 'tests/auth/power-user.json'
  });

  console.log('✅ Power user session with test data created');
});

setup('prepare test match data', async ({ page }) => {
  console.log('🎮 Preparing test match data...');

  // Mock API responses for consistent testing
  await page.route('**/api/matches**', async route => {
    const mockMatches = [
      {
        id: 'match_001',
        title: 'Gungi Championship Final',
        players: ['Player A', 'Player B'],
        status: 'live',
        start_time: new Date().toISOString(),
        betting_odds: { player_a: 1.5, player_b: 2.3 }
      },
      {
        id: 'match_002',
        title: 'Chess Master Tournament',
        players: ['Player C', 'Player D'],
        status: 'upcoming',
        start_time: new Date(Date.now() + 3600000).toISOString(),
        betting_odds: { player_c: 1.8, player_d: 2.0 }
      }
    ];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ matches: mockMatches })
    });
  });

  console.log('✅ Test match data prepared');
});
