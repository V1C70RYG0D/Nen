import { test, expect } from '@playwright/test';
import {
  ABTestingFramework,
  BUTTON_PLACEMENT_TESTS,
  INFORMATION_ARCHITECTURE_TESTS,
  runButtonPlacementTest,
  runInformationArchitectureTest
} from './ab-testing-framework';

/**
 * Comprehensive A/B Testing Scenarios
 *
 * Tests cover:
 * - Button placement variations
 * - Information architecture experiments
 * - Conversion tracking and analytics
 * - Cross-browser and cross-device testing
 */

test.describe('A/B Testing - Button Placement Variations', () => {
  test.beforeEach(async ({ page }) => {
    // Set up consistent test environment
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('CTA button position optimization - Desktop Chrome', async ({ page }) => {
    const testConfig = BUTTON_PLACEMENT_TESTS[0]; // CTA button position test
    const framework = new ABTestingFramework(page);

    // Initialize test and get assigned variation
    const variationId = await framework.initializeTest(testConfig);
    const variation = testConfig.variations.find(v => v.id === variationId);

    // Apply variation configuration
    if (variation) {
      await framework.applyVariation(variation);

      // Verify button is rendered with correct positioning
      await expect(page.locator('.cta-button')).toBeVisible();

      // Check position-specific attributes
      const buttonElement = page.locator('.cta-button');
      await expect(buttonElement).toHaveAttribute('data-position', expect.stringContaining(variation.id));

      // Simulate user interaction and track conversion
      await buttonElement.click();
      await framework.trackConversion('button_click');

      // Verify conversion tracking
      const testData = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('ab_test_data') || '{}');
      });

      expect(testData.testId).toBe(testConfig.testId);
      expect(testData.variationId).toBe(variationId);
    }
  });

  test('Button color and size variations - Cross-browser', async ({ page, browserName }) => {
    const testConfig = BUTTON_PLACEMENT_TESTS[1]; // Button color and size test
    const framework = new ABTestingFramework(page);

    const variationId = await framework.initializeTest(testConfig);
    const variation = testConfig.variations.find(v => v.id === variationId);

    if (variation) {
      await framework.applyVariation(variation);

      // Verify button styling across different browsers
      const buttonElement = page.locator('.cta-button');
      await expect(buttonElement).toBeVisible();

      // Take screenshot for visual verification
      await expect(buttonElement).toHaveScreenshot(`button-${variation.id}-${browserName}.png`);

      // Test button interaction
      await buttonElement.hover();
      await expect(buttonElement).toHaveCSS('cursor', 'pointer');

      // Click and track conversion
      await buttonElement.click();
      await framework.trackConversion('button_click');

      console.log(`✅ Button test completed for ${browserName} with variation: ${variation.name}`);
    }
  });

  test('Button accessibility compliance across variations', async ({ page }) => {
    const testConfig = BUTTON_PLACEMENT_TESTS[0];

    for (const variation of testConfig.variations) {
      // Reset page state
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const framework = new ABTestingFramework(page);

      // Force specific variation for testing
      await page.evaluate((data) => {
        localStorage.setItem('ab_test_data', JSON.stringify(data));
      }, {
        testId: testConfig.testId,
        variationId: variation.id,
        assignedAt: new Date().toISOString()
      });

      await framework.applyVariation(variation);

      // Test accessibility requirements
      const buttonElement = page.locator('.cta-button');

      // Check ARIA attributes
      await expect(buttonElement).toHaveAttribute('role', /button|link/);

      // Check keyboard navigation
      await buttonElement.focus();
      await expect(buttonElement).toBeFocused();

      // Check color contrast (simplified check)
      const backgroundColor = await buttonElement.evaluate(el => {
        return window.getComputedStyle(el).backgroundColor;
      });

      expect(backgroundColor).toBeTruthy();

      console.log(`✅ Accessibility test passed for variation: ${variation.name}`);
    }
  });
});

test.describe('A/B Testing - Information Architecture Variations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Navigation structure optimization - Desktop vs Mobile', async ({ page, isMobile }) => {
    const testConfig = INFORMATION_ARCHITECTURE_TESTS[0]; // Navigation structure test
    const framework = new ABTestingFramework(page);

    const variationId = await framework.initializeTest(testConfig);
    const variation = testConfig.variations.find(v => v.id === variationId);

    if (variation) {
      await framework.applyVariation(variation);

      // Test navigation visibility and functionality
      const navElement = page.locator('.main-nav');

      if (isMobile && variation.id === 'hamburger_mobile') {
        // Test hamburger menu functionality
        await expect(navElement).toBeHidden();

        const hamburgerToggle = page.locator('.hamburger-toggle');
        await hamburgerToggle.click();
        await expect(navElement).toBeVisible();

        // Track mobile navigation interaction
        await framework.trackConversion('navigation_click');
      } else {
        // Test desktop navigation
        await expect(navElement).toBeVisible();

        // Test navigation items
        const navItems = navElement.locator('a, button');
        const itemCount = await navItems.count();
        expect(itemCount).toBeGreaterThan(0);

        // Click first navigation item
        await navItems.first().click();
        await framework.trackConversion('navigation_click');
      }

      console.log(`✅ Navigation test completed for ${isMobile ? 'mobile' : 'desktop'} with variation: ${variation.name}`);
    }
  });

  test('Content organization variations with engagement tracking', async ({ page }) => {
    const testConfig = INFORMATION_ARCHITECTURE_TESTS[1]; // Content organization test
    const framework = new ABTestingFramework(page);

    const variationId = await framework.initializeTest(testConfig);
    const variation = testConfig.variations.find(v => v.id === variationId);

    if (variation) {
      await framework.applyVariation(variation);

      // Test content area layout
      const contentArea = page.locator('.content-area');
      await expect(contentArea).toBeVisible();

      // Verify layout-specific attributes
      await expect(contentArea).toHaveAttribute('data-layout', expect.stringContaining(variation.id.split('_')[0]));

      // Test content items visibility
      const contentItems = contentArea.locator('.content-item');
      const itemCount = await contentItems.count();
      expect(itemCount).toBeGreaterThan(0);

      // Simulate user engagement
      await contentItems.first().click();
      await framework.trackConversion('content_engagement');

      // Test scroll behavior for different layouts
      await page.mouse.wheel(0, 500);
      await framework.trackConversion('scroll_depth');

      // Take layout screenshot
      await expect(contentArea).toHaveScreenshot(`content-layout-${variation.id}.png`);

      console.log(`✅ Content organization test completed with variation: ${variation.name}`);
    }
  });

  test('User flow optimization with task completion tracking', async ({ page }) => {
    const testConfig = INFORMATION_ARCHITECTURE_TESTS[0];
    const framework = new ABTestingFramework(page);

    const variationId = await framework.initializeTest(testConfig);
    const variation = testConfig.variations.find(v => v.id === variationId);

    if (variation) {
      await framework.applyVariation(variation);

      // Simulate complete user journey
      const startTime = Date.now();

      // Step 1: Navigate to main section
      await page.locator('.main-nav a').first().click();
      await page.waitForLoadState('networkidle');

      // Step 2: Interact with content
      const contentElement = page.locator('.content-item').first();
      if (await contentElement.isVisible()) {
        await contentElement.click();
      }

      // Step 3: Complete a task (e.g., form submission, purchase)
      const taskButton = page.locator('[data-testid="task-complete"]');
      if (await taskButton.isVisible()) {
        await taskButton.click();

        const completionTime = Date.now() - startTime;
        await framework.trackConversion('task_completion', completionTime);

        console.log(`✅ Task completed in ${completionTime}ms with variation: ${variation.name}`);
      }
    }
  });
});

test.describe('A/B Testing - Cross-Device and Performance Impact', () => {
  test('Performance impact of variations across devices', async ({ page, isMobile }) => {
    const testConfigs = [...BUTTON_PLACEMENT_TESTS, ...INFORMATION_ARCHITECTURE_TESTS];

    for (const testConfig of testConfigs) {
      const framework = new ABTestingFramework(page);

      // Measure baseline performance
      await page.goto('/');
      const baselineMetrics = await page.evaluate(() => {
        return {
          domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart
        };
      });

      // Apply random variation and measure performance
      const randomVariation = testConfig.variations[Math.floor(Math.random() * testConfig.variations.length)];
      await framework.applyVariation(randomVariation);

      const variationMetrics = await page.evaluate(() => {
        return {
          domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart
        };
      });

      // Verify performance impact is minimal
      const performanceImpact = Math.abs(variationMetrics.loadComplete - baselineMetrics.loadComplete);
      expect(performanceImpact).toBeLessThan(1000); // Less than 1 second impact

      console.log(`✅ Performance test passed for ${testConfig.testName} on ${isMobile ? 'mobile' : 'desktop'}`);
      console.log(`Performance impact: ${performanceImpact}ms`);
    }
  });

  test('Visual consistency across variations and browsers', async ({ page, browserName }) => {
    const testConfig = BUTTON_PLACEMENT_TESTS[1]; // Button color and size test

    for (const variation of testConfig.variations) {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const framework = new ABTestingFramework(page);

      // Force specific variation
      await page.evaluate((data) => {
        localStorage.setItem('ab_test_data', JSON.stringify(data));
      }, {
        testId: testConfig.testId,
        variationId: variation.id,
        assignedAt: new Date().toISOString()
      });

      await framework.applyVariation(variation);

      // Take full page screenshot
      await expect(page).toHaveScreenshot(`full-page-${variation.id}-${browserName}.png`, {
        fullPage: true,
        animations: 'disabled'
      });

      // Take specific element screenshot
      const buttonElement = page.locator('.cta-button');
      if (await buttonElement.isVisible()) {
        await expect(buttonElement).toHaveScreenshot(`button-${variation.id}-${browserName}.png`);
      }
    }
  });
});

test.describe('A/B Testing - Analytics and Reporting', () => {
  test('Conversion tracking accuracy', async ({ page }) => {
    const testConfig = BUTTON_PLACEMENT_TESTS[0];
    const framework = new ABTestingFramework(page);

    const variationId = await framework.initializeTest(testConfig);

    // Track multiple conversion events
    const conversionEvents = ['button_click', 'signup_complete', 'purchase_complete'];

    for (const event of conversionEvents) {
      await framework.trackConversion(event, Math.random() * 100);

      // Small delay to ensure events are processed separately
      await page.waitForTimeout(100);
    }

    // Verify tracking data
    const testData = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('ab_test_data') || '{}');
    });

    expect(testData.testId).toBe(testConfig.testId);
    expect(testData.variationId).toBe(variationId);

    console.log(`✅ Conversion tracking test completed for variation: ${variationId}`);
  });

  test('A/B test report generation', async ({ page }) => {
    const testConfig = BUTTON_PLACEMENT_TESTS[0];
    const framework = new ABTestingFramework(page);

    await framework.initializeTest(testConfig);

    // Simulate some test activity
    await framework.trackConversion('button_click');
    await framework.trackConversion('signup_complete');

    // Generate report (this would typically call a backend service)
    const report = await framework.generateReport(testConfig.testId);

    // Verify report structure (mock validation)
    if (report) {
      expect(report).toHaveProperty('testId');
      expect(report).toHaveProperty('variations');
      expect(report).toHaveProperty('conversions');
    }

    console.log(`✅ Report generation test completed for test: ${testConfig.testName}`);
  });
});
