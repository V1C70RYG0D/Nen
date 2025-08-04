import { test, expect } from '@playwright/test';

['chromium', 'firefox', 'webkit'].forEach(browserName => {
  test.describe(`${browserName} specific tests`, () => {
    test('renders game board correctly', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto('/arena/test-match');
      await expect(page.locator('.game-board')).toBeVisible();
      await page.screenshot({
        path: `screenshots/${browserName}-gameboard.png`
      });

      await context.close();
    });
  });
});

