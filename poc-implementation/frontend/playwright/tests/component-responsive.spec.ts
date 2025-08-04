import { test, expect } from '@playwright/test';

// Define breakpoints based on Tailwind CSS defaults and custom requirements
const BREAKPOINTS = {
  mobile: { width: 320, height: 568, name: 'Mobile' },
  tablet: { width: 768, height: 1024, name: 'Tablet' },
  desktop: { width: 1024, height: 768, name: 'Desktop' },
  desktopLarge: { width: 1440, height: 900, name: 'Desktop Large' }
};

// Minimum touch-friendly sizes (44x44px per WCAG guidelines)
const TOUCH_TARGET_MIN_SIZE = 44;

test.describe('Responsive Component Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main page
    await page.goto('/');
  });

  Object.entries(BREAKPOINTS).forEach(([key, viewport]) => {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      });

      test('should prevent horizontal scrolling', async ({ page }) => {
        // Check main content doesn't exceed viewport width
        const body = page.locator('body');
        const bodyWidth = await body.evaluate(el => el.scrollWidth);
        const viewportWidth = viewport.width;

        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // Allow 5px tolerance
      });

      test('should have proper viewport handling', async ({ page }) => {
        // Check that viewport meta tag is present and correctly configured
        const viewportMeta = page.locator('meta[name="viewport"]');
        await expect(viewportMeta).toHaveAttribute('content', /width=device-width/);
      });

      test('should have touch-friendly interactive elements', async ({ page }) => {
        if (key === 'mobile' || key === 'tablet') {
          // Find all interactive elements
          const buttons = page.locator('button, a[href], input, [role="button"]');
          const buttonCount = await buttons.count();

          for (let i = 0; i < buttonCount; i++) {
            const button = buttons.nth(i);
            const boundingBox = await button.boundingBox();

            if (boundingBox) {
              // Check minimum touch target size
              expect(boundingBox.width).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN_SIZE - 10); // Allow 10px tolerance
              expect(boundingBox.height).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN_SIZE - 10);
            }
          }
        }
      });

      test('should have readable text at all sizes', async ({ page }) => {
        // Check text elements have appropriate sizing
        const textElements = page.locator('p, span, h1, h2, h3, h4, h5, h6, div');
        const textCount = await textElements.count();

        for (let i = 0; i < Math.min(textCount, 10); i++) { // Sample first 10 elements
          const element = textElements.nth(i);
          const computedStyle = await element.evaluate(el => {
            const style = window.getComputedStyle(el);
            return {
              fontSize: parseFloat(style.fontSize),
              lineHeight: style.lineHeight,
              display: style.display
            };
          });

          if (computedStyle.display !== 'none') {
            // Minimum font size for readability (14px mobile, 16px desktop)
            const minFontSize = key === 'mobile' ? 14 : 16;
            expect(computedStyle.fontSize).toBeGreaterThanOrEqual(minFontSize - 2); // Allow 2px tolerance
          }
        }
      });

      test('should adapt layout appropriately', async ({ page }) => {
        // Test navigation layout changes
        const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
        const desktopNavigation = page.locator('nav .hidden.md\\:flex');

        if (key === 'mobile') {
          // Mobile should show hamburger menu
          await expect(mobileMenuButton).toBeVisible();
          // Desktop navigation should be hidden
          await expect(desktopNavigation).toBeHidden();
        } else {
          // Desktop should show full navigation
          await expect(desktopNavigation).toBeVisible();
          // Mobile menu button should be hidden
          await expect(mobileMenuButton).toBeHidden();
        }
      });

      test('should handle component spacing correctly', async ({ page }) => {
        // Check that components have appropriate spacing and don't overlap
        const mainContent = page.locator('main, [role="main"]');
        const hasOverflow = await mainContent.evaluate(el => {
          if (!el) return false;
          return el.scrollWidth > el.clientWidth;
        });

        expect(hasOverflow).toBeFalsy();
      });

      test('should display wallet components properly', async ({ page }) => {
        // Test wallet button rendering at different sizes
        const walletButton = page.locator('.wallet-adapter-button-trigger');

        if (await walletButton.count() > 0) {
          await expect(walletButton).toBeVisible();

          const buttonBox = await walletButton.boundingBox();
          if (buttonBox) {
            // Ensure wallet button is appropriately sized
            if (key === 'mobile') {
              expect(buttonBox.width).toBeLessThanOrEqual(viewport.width * 0.8); // Max 80% of screen width
            }
          }
        }
      });

      test('should handle form elements responsively', async ({ page }) => {
        // Navigate to a page with forms if available
        const formElements = page.locator('input, textarea, select, button[type="submit"]');
        const formCount = await formElements.count();

        for (let i = 0; i < formCount; i++) {
          const element = formElements.nth(i);
          const boundingBox = await element.boundingBox();

          if (boundingBox) {
            // Forms should not exceed container width
            expect(boundingBox.width).toBeLessThanOrEqual(viewport.width);

            // Touch targets should be large enough on mobile/tablet
            if (key === 'mobile' || key === 'tablet') {
              expect(boundingBox.height).toBeGreaterThanOrEqual(40); // Minimum input height
            }
          }
        }
      });

      test('should handle images and media responsively', async ({ page }) => {
        const images = page.locator('img');
        const imageCount = await images.count();

        for (let i = 0; i < imageCount; i++) {
          const img = images.nth(i);
          const boundingBox = await img.boundingBox();

          if (boundingBox) {
            // Images should not exceed viewport width
            expect(boundingBox.width).toBeLessThanOrEqual(viewport.width + 5); // Allow small tolerance
          }
        }
      });

      test('should maintain proper contrast and visibility', async ({ page }) => {
        // Take screenshot for visual regression testing
        await page.screenshot({
          path: `playwright/screenshots/responsive-${key}-${viewport.width}x${viewport.height}.png`,
          fullPage: true
        });

        // Check for basic visibility of key elements
        const logo = page.locator('[aria-label*="logo"], [aria-label*="home"]').first();
        const navigation = page.locator('nav').first();

        await expect(logo).toBeVisible();
        await expect(navigation).toBeVisible();
      });
    });
  });

  test.describe('Cross-breakpoint behavior', () => {
    test('should maintain functionality across viewport changes', async ({ page }) => {
      // Start with desktop
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/');

      // Verify desktop navigation works
      const desktopNav = page.locator('nav .hidden.md\\:flex a').first();
      if (await desktopNav.count() > 0) {
        await expect(desktopNav).toBeVisible();
      }

      // Switch to mobile
      await page.setViewportSize({ width: 320, height: 568 });

      // Verify mobile navigation appears
      const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
      if (await mobileMenuButton.count() > 0) {
        await expect(mobileMenuButton).toBeVisible();
      }

      // Switch to tablet
      await page.setViewportSize({ width: 768, height: 1024 });

      // Take screenshot at tablet size
      await page.screenshot({
        path: 'playwright/screenshots/cross-breakpoint-tablet.png',
        fullPage: true
      });
    });
  });
});
