import { test, expect } from '@playwright/test';

const BREAKPOINTS = {
  mobile: { width: 320, height: 568, name: 'Mobile' },
  tablet: { width: 768, height: 1024, name: 'Tablet' },
  desktop: { width: 1024, height: 768, name: 'Desktop' },
  'desktop-large': { width: 1440, height: 900, name: 'Desktop Large' }
};

test.describe('Basic Responsive Design Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main page with extended timeout
    await page.goto('/', { waitUntil: 'networkidle' });
  });

  Object.entries(BREAKPOINTS).forEach(([key, viewport]) => {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      });

      test('should load page successfully', async ({ page }) => {
        // Basic check that page loads
        await expect(page).toHaveTitle(/Nen Platform/i);

        // Check that body is visible
        const body = page.locator('body');
        await expect(body).toBeVisible();
      });

      test('should prevent horizontal scrolling', async ({ page }) => {
        // Check that the page doesn't have horizontal scroll
        const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
        const clientWidth = await page.evaluate(() => document.body.clientWidth);

        // Allow small tolerance for scrollbars
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 20);
      });

      test('should have proper viewport meta tag', async ({ page }) => {
        // Check viewport meta tag
        const viewportMeta = page.locator('meta[name="viewport"]');
        await expect(viewportMeta).toHaveAttribute('content', /width=device-width/);
      });
    });
  });
});
