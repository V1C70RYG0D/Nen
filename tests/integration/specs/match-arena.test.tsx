import { test, expect, Page } from '@playwright/test';

/**
 * Match Arena Integration Tests
 * Tests match ID handling, game board integration, real-time updates, and betting panel
 */
test.describe('Match Arena Integration Tests', () => {
  let page: Page;
  const matchId = 'test-match-001';

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Mock API responses for match data
    await setupMatchAPIResponses(page, matchId);
    
    await page.goto(`/arena/${matchId}`, { waitUntil: 'networkidle' });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Match Header Information', () => {
    test('should display correct match ID and agent information', async () => {
      const matchHeader = page.locator('[data-testid="match-header"]');
      if (await matchHeader.isVisible()) {
        await expect(matchHeader).toContainText(matchId);
        await expect(matchHeader).toContainText('Agent');
      }
    });

    test('should display pool information', async () => {
      const poolInfo = page.locator('[data-testid="pool-info"]');
      await expect(poolInfo).toBeVisible();
      await expect(poolInfo).toContainText('Total Pool:');
    });
  });

  test.describe('Game Board Integration', () => {
    test('should synchronize board state in real-time', async () => {
      // Initial board state
      const boardState = page.locator('[data-testid="game-board"]');
      await expect(boardState).toContainText('initial-board-state');

      // Simulate real-time move update
      await simulateRealTimeBoardUpdate(page, { move: 'e2 to e4' });
      await expect(boardState).toContainText('e2 to e4');
    });

    test('should display move history', async () => {
      const moveHistory = page.locator('[data-testid="move-history"]');
      await expect(moveHistory).toBeVisible();
      await expect(moveHistory).toContainText('e2 to e4');
    });
  });

  test.describe('Betting Panel Integration', () => {
    test('should complete seamless betting flow', async () => {
      const betButton = page.locator('[data-testid="bet-button"]');
      await expect(betButton).toBeVisible();
      await betButton.click();

      const confirmation = page.locator('[data-testid="bet-confirmation"]');
      await expect(confirmation).toBeVisible();
      await expect(confirmation).toContainText('Bet successful');
    });

    test('should display error for failed transactions', async () => {
      // Simulate transaction failure
      await simulateTransactionFailure(page);

      const errorBanner = page.locator('[data-testid="transaction-error"]');
      await expect(errorBanner).toBeVisible();
      await expect(errorBanner).toContainText('Transaction failed');
    });
  });
});

/**
 * Setup mock API responses for a match.
 */
async function setupMatchAPIResponses(page: Page, matchId: string) {
  await page.route(`**/api/match/${matchId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: matchId,
        agents: ['Agent 1', 'Agent 2'],
        pool: 10,
        boardState: 'initial-board-state',
        history: ['e2 to e4']
      }),
    });
  });
}

/**
 * Simulate real-time board updates via mocked WebSocket.
 */
async function simulateRealTimeBoardUpdate(page: Page, update: { move: string }) {
  await page.evaluate(({ move }) => {
    const event = new CustomEvent('boardUpdate', { detail: { move } });
    window.dispatchEvent(event);
  }, update);
}

/**
 * Simulate a transaction failure to test error handling.
 */
async function simulateTransactionFailure(page: Page) {
  await page.evaluate(() => {
    const event = new CustomEvent('transactionFailure', { detail: { message: 'Transaction failed' } });
    window.dispatchEvent(event);
  });
}

