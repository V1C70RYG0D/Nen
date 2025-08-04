import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  const sizes = [
    { width: 320, height: 480, name: 'Mobile' },
    { width: 768, height: 1024, name: 'Tablet' },
    { width: 1024, height: 768, name: 'Desktop Small' },
    { width: 1440, height: 900, name: 'Desktop Large' },
  ];

  for (const size of sizes) {
    test(`should be responsive at ${size.name} (${size.width}x${size.height})`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto('/');

      // Check for horizontal scrolling
      const body = page.locator('body');
      const hasHorizontalScroll = await body.evaluate(el => el.scrollWidth > el.clientWidth);
      expect(hasHorizontalScroll).toBeFalsy();

      // Take a screenshot for visual regression testing
      await page.screenshot({ path: `screenshots/${size.name}-${size.width}x${size.height}.png`, fullPage: true });
    });
  }
});
