import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load test data
const apiEndpoints = JSON.parse(
  readFileSync(join(__dirname, '../test-data/api-endpoints.json'), 'utf8')
);

/**
 * API Integration Tests
 * Tests REST API endpoints for health, authentication, wallet, and game
 */
test.describe('API Integration Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should verify backend health endpoint', async () => {
    if (!process.env.API_URL && !process.env.DEFAULT_API_URL) {
    }
    const apiUrl = process.env.API_URL || process.env.DEFAULT_API_URL;
    const response = await page.request.get(`${apiUrl}${apiEndpoints.health}`);
    expect(response.status()).toBe(200);
    const healthData = await response.json();
    expect(healthData).toHaveProperty('status', 'healthy');
  });

  test('should authenticate user with valid credentials', async () => {
    if (!process.env.API_URL && !process.env.DEFAULT_API_URL) {
    }
    const apiUrl = process.env.API_URL || process.env.DEFAULT_API_URL;
    const response = await page.request.post(`${apiUrl}${apiEndpoints.auth}`, {
      data: {
        username: 'testuser',
        password: 'testpass123'
      }
    });
    expect(response.status()).toBe(200);
    const authData = await response.json();
    expect(authData).toHaveProperty('token');
  });

  test('should return authentication error for invalid credentials', async () => {
    const apiUrl = process.env.API_URL || process.env.DEFAULT_API_URL;
    if (!apiUrl) {
    }

    const response = await page.request.post(`${apiUrl}${apiEndpoints.auth}`, {
      data: {
        username: 'wronguser',
        password: 'wrongpass'
      }
    });
    expect(response.status()).toBe(401);
    const authData = await response.json();
    expect(authData).toHaveProperty('error', 'Unauthorized');
  });

  test('should facilitate wallet balance check', async () => {
    const apiUrl = process.env.API_URL || process.env.DEFAULT_API_URL;
    if (!apiUrl) {
    }

    await page.route('**/api/wallet/balance', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ balance: 3.0, currency: 'SOL' })
      });
    });

    const response = await page.request.get(`${apiUrl}${apiEndpoints.wallet}/balance`);
    expect(response.status()).toBe(200);
    const walletData = await response.json();
    expect(walletData).toHaveProperty('balance', 3.0);
    expect(walletData).toHaveProperty('currency', 'SOL');
  });

  test('should fetch game state for an active game', async () => {
    const apiUrl = process.env.API_URL || process.env.DEFAULT_API_URL;
    if (!apiUrl) {
    }

    await page.route('**/api/game', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          gameId: gameTestData.testGame.id,
          players: gameTestData.testGame.players,
          status: gameTestData.testGame.status,
          board: 'game-board-state'
        })
      });
    });

    const response = await page.request.get(`${apiUrl}${apiEndpoints.game}`);
    expect(response.status()).toBe(200);
    const gameData = await response.json();
    expect(gameData).toHaveProperty('gameId', gameTestData.testGame.id);
    expect(gameData).toHaveProperty('players', gameTestData.testGame.players);
    expect(gameData).toHaveProperty('status', gameTestData.testGame.status);
    expect(gameData).toHaveProperty('board', 'game-board-state');
  });

  test('should support making a bet', async () => {
    const apiUrl = process.env.API_URL || process.env.DEFAULT_API_URL;
    if (!apiUrl) {
    }

    const betData = {
      gameId: gameTestData.testGame.id,
      amount: 0.2,
      player: 'test-player-1'
    };

    await page.route('**/api/betting', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          betId: 'new-bet-123',
          newBalance: 2.8
        })
      });
    });

    const response = await page.request.post(`${apiUrl}${apiEndpoints.betting}`, {
      data: betData
    });
    expect(response.status()).toBe(200);
    const betResponse = await response.json();
    expect(betResponse).toHaveProperty('success', true);
    expect(betResponse).toHaveProperty('betId', 'new-bet-123');
    expect(betResponse).toHaveProperty('newBalance', 2.8);
  });
});

