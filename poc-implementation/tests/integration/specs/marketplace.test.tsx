import { test, expect, Page } from '@playwright/test';

/**
 * Marketplace Integration Tests
 * Tests agent catalog display, filtering and sorting, and purchase flow
 */
test.describe('Marketplace Integration Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Mock API responses for marketplace data
    await setupMarketplaceAPIResponses(page);
    
    await page.goto('/marketplace', { waitUntil: 'networkidle' });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Agent Catalog Display', () => {
    test('should render agent grid correctly with images', async () => {
      const agentGrid = page.locator('[data-testid="agent-grid"]');
      await expect(agentGrid).toBeVisible();

      // Verify images are loaded and optimized
      const images = agentGrid.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const src = await img.getAttribute('src');
        
        await expect(src).toMatch(/cdn/); // Should use a CDN for optimization
      }
    });

    test('should load agent information accurately', async () => {
      const agentCards = page.locator('[data-testid^="agent-card-"]');
      const cardCount = await agentCards.count();

      if (cardCount > 0) {
        const firstCard = agentCards.first();

        await expect(firstCard).toBeVisible();

        // Check agent info
        const name = firstCard.locator('[data-testid="agent-name"]');
        const price = firstCard.locator('[data-testid="agent-price"]');
        
        await expect(name).toBeVisible();
        await expect(price).toContainText('SOL');
      }
    });
  });

  test.describe('Filtering and Sorting', () => {
    test('should filter agents based on criteria', async () => {
      const filterInput = page.locator('[data-testid="filter-input"]');

      await filterInput.fill('High Price');

      const filterButton = page.locator('[data-testid="filter-button"]');
      await filterButton.click();

      // Check that filtered results appear
      const filteredAgents = page.locator('[data-testid^="agent-card-"]');
      const count = await filteredAgents.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should sort agents correctly', async () => {
      const sortSelect = page.locator('[data-testid="sort-select"]');

      await sortSelect.selectOption('price-asc');

      // Ensure sorting is reflected in UI
      const firstAgentPrice = await page.locator('[data-testid="agent-card-price-"]').first().textContent();
      const lastAgentPrice = await page.locator('[data-testid="agent-card-price-"]').last().textContent();

      if (firstAgentPrice && lastAgentPrice) {
        const firstPriceValue = parseFloat(firstAgentPrice.replace('SOL', '').trim());
        const lastPriceValue = parseFloat(lastAgentPrice.replace('SOL', '').trim());

        expect(firstPriceValue).toBeLessThanOrEqual(lastPriceValue);
      }
    });

    test('should persist sort state after reload', async () => {
      const sortSelect = page.locator('[data-testid="sort-select"]');

      await sortSelect.selectOption('price-desc');

      await page.reload();

      // Ensure the sort order is persisted
      const currentOption = await sortSelect.inputValue();
      expect(currentOption).toBe('price-desc');
    });
  });

  test.describe('Purchase Flow', () => {
    test('should handle successful purchase', async () => {
      const buyButton = page.locator('[data-testid="buy-button"]');
      await expect(buyButton).toBeVisible();
      await buyButton.click();

      // Mock transaction success
      const confirmation = page.locator('[data-testid="purchase-confirmation"]');
      await expect(confirmation).toBeVisible();
      await expect(confirmation).toContainText('Purchase successful');
    });

    test('should handle purchase errors gracefully', async () => {
      // Mock transaction error
      await simulatePurchaseError(page);

      const errorMessage = page.locator('[data-testid="purchase-error"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Purchase failed');
    });
  });
});

/**
 * Setup mock API responses for marketplace data.
 */
async function setupMarketplaceAPIResponses(page: Page) {
  await page.route('**/api/marketplace', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        agents: Array.from({ length: 100 }, (_, i) => ({
          id: `agent-${i + 1}`,
          name: `Agent ${i + 1}`,
          price: (i + 1) * 0.1,
          image: process.env.TEST_IMAGE_URL || process.env.DEFAULT_TEST_IMAGE_URL || (() => {
            throw new Error('TEST_IMAGE_URL or DEFAULT_TEST_IMAGE_URL must be set in environment variables. GI-18: No hardcoded values allowed.');
          })()
        }))
      })
    });
  });
}

/**
 * Simulate a purchase error.
 */
async function simulatePurchaseError(page: Page) {
  await page.evaluate(() => {
    const event = new CustomEvent('purchaseError', { detail: { message: 'Purchase failed' } });
    window.dispatchEvent(event);
  });
}

