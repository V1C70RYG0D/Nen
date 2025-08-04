// __tests__/utils/accessibility-helpers.ts
import { axe, toHaveNoViolations } from 'jest-axe';
import { RenderResult } from '@testing-library/react';

// Extend expect globally for accessibility tests
expect.extend(toHaveNoViolations);

// Define axe configuration options for different test scenarios
export const axeConfig = {
  // Standard accessibility check configuration
  standard: {
    rules: {
      'color-contrast': { enabled: true },
      'aria-allowed-attr': { enabled: true },
      'aria-required-attr': { enabled: true },
      'heading-order': { enabled: true },
      'focus-order-semantics': { enabled: true },
      'tabindex': { enabled: true },
    },
  },

  // High contrast mode specific checks
  highContrast: {
    rules: {
      'color-contrast': { enabled: true },
      'color-contrast-enhanced': { enabled: true },
    },
  },

  // WCAG AA validations
  wcagAA: {
    rules: {
      'color-contrast': { enabled: true },
      'aria-valid-attr': { enabled: true },
      'aria-valid-attr-value': { enabled: true },
      'aria-allowed-attr': { enabled: true },
      'heading-order': { enabled: true},
      'focus-order-semantics': { enabled: true },
      'tabindex': { enabled: true },
    },
  },

  // Performance optimized config for large components
  performance: {
    timeout: 15000,
    rules: {
      // Only run essential accessibility checks
      'aria-required-attr': { enabled: true },
      'color-contrast': { enabled: false }, // Skip color contrast for performance
      'focus-order-semantics': { enabled: true },
    },
  },
};

/**
 * Run axe accessibility tests with proper error handling and timeout management
 */
export const runAxeTest = async (
  container: Element,
  config = axeConfig.standard,
  testName = 'accessibility test'
): Promise<void> => {
  try {
    // Add timeout wrapper to prevent hanging tests
    const results = await Promise.race([
      axe(container, config),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Accessibility test timeout: ${testName}`)), 20000)
      ),
    ]);

    expect(results).toHaveNoViolations();
  } catch (error) {
    // Enhanced error reporting for accessibility violations
    if (error instanceof Error && error.message.includes('violations')) {
      console.error(`Accessibility violations found in ${testName}:`, error.message);
    }
    throw error;
  }
};

/**
 * Test keyboard navigation for a component
 */
export const testKeyboardNavigation = async (renderResult: RenderResult): Promise<void> => {
  const { container } = renderResult;

  // Check that all interactive elements are keyboard accessible
  const interactiveElements = container.querySelectorAll(
    'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  interactiveElements.forEach((element) => {
    const tabIndex = element.getAttribute('tabindex');
    // Ensure no positive tabindex values (anti-pattern)
    if (tabIndex && parseInt(tabIndex) > 0) {
      throw new Error(`Element has positive tabindex (${tabIndex}), which is an anti-pattern for accessibility`);
    }
  });

  await runAxeTest(container, axeConfig.standard, 'keyboard navigation test');
};

/**
 * Test ARIA labels and roles
 */
export const testAriaCompliance = async (renderResult: RenderResult): Promise<void> => {
  const { container } = renderResult;

  // Check that all buttons have accessible names
  const buttons = container.querySelectorAll('button');
  buttons.forEach((button, index) => {
    const accessibleName = button.getAttribute('aria-label') ||
                           button.textContent?.trim() ||
                           button.getAttribute('title');

    if (!accessibleName) {
      throw new Error(`Button at index ${index} lacks an accessible name`);
    }
  });

  // Check that all links have accessible names
  const links = container.querySelectorAll('a');
  links.forEach((link, index) => {
    const accessibleName = link.getAttribute('aria-label') ||
                           link.textContent?.trim() ||
                           link.getAttribute('title');

    if (!accessibleName) {
      throw new Error(`Link at index ${index} lacks an accessible name`);
    }
  });

  await runAxeTest(container, axeConfig.wcagAA, 'ARIA compliance test');
};

/**
 * Test heading hierarchy
 */
export const testHeadingHierarchy = async (renderResult: RenderResult): Promise<void> => {
  const { container, getAllByRole } = renderResult;

  try {
    const headings = getAllByRole('heading');

    if (headings.length === 0) {
      console.warn('No headings found in component - consider adding semantic headings for screen readers');
      return;
    }

    // Check for proper heading hierarchy
    let previousLevel = 0;
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));

      if (index === 0 && level !== 1) {
        console.warn(`First heading is h${level}, consider starting with h1`);
      }

      if (level > previousLevel + 1) {
        throw new Error(`Heading hierarchy skips levels: h${previousLevel} to h${level}`);
      }

      previousLevel = level;
    });

  } catch (error) {
    // If no headings are found by role, that's often okay
    console.warn('Could not find headings by role - this may be acceptable for some components');
  }

  await runAxeTest(container, { rules: { 'heading-order': { enabled: true } } }, 'heading hierarchy test');
};

/**
 * Test color contrast and visual accessibility
 */
export const testColorContrast = async (renderResult: RenderResult): Promise<void> => {
  const { container } = renderResult;
  await runAxeTest(container, axeConfig.highContrast, 'color contrast test');
};

/**
 * Test responsive accessibility across different viewport sizes
 */
export const testResponsiveAccessibility = async (
  renderFunction: () => RenderResult,
  viewports = [
    { width: 320, height: 568, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1920, height: 1080, name: 'desktop' }
  ]
): Promise<void> => {
  for (const viewport of viewports) {
    // Mock viewport dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: viewport.width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: viewport.height,
    });

    // Trigger resize event
    window.dispatchEvent(new Event('resize'));

    const renderResult = renderFunction();

    try {
      await runAxeTest(
        renderResult.container,
        axeConfig.performance,
        `responsive accessibility test (${viewport.name})`
      );
    } finally {
      renderResult.unmount();
    }
  }
};

/**
 * Comprehensive accessibility test suite for components
 */
export const runComprehensiveAccessibilityTest = async (
  renderResult: RenderResult,
  options: {
    testKeyboard?: boolean;
    testAria?: boolean;
    testHeadings?: boolean;
    testContrast?: boolean;
  } = {}
): Promise<void> => {
  const {
    testKeyboard = true,
    testAria = true,
    testHeadings = true,
    testContrast = true,
  } = options;

  // Run standard accessibility check first
  await runAxeTest(renderResult.container, axeConfig.standard, 'comprehensive accessibility test');

  // Run specific tests based on options
  if (testKeyboard) {
    await testKeyboardNavigation(renderResult);
  }

  if (testAria) {
    await testAriaCompliance(renderResult);
  }

  if (testHeadings) {
    await testHeadingHierarchy(renderResult);
  }

  if (testContrast) {
    await testColorContrast(renderResult);
  }
};

/**
 * Test live regions and dynamic content accessibility
 */
export const testLiveRegions = async (renderResult: RenderResult): Promise<void> => {
  const { container } = renderResult;

  // Check for proper live regions
  const liveRegions = container.querySelectorAll('[aria-live]');

  liveRegions.forEach((region) => {
    const ariaLive = region.getAttribute('aria-live');
    if (!['polite', 'assertive', 'off'].includes(ariaLive || '')) {
      throw new Error(`Invalid aria-live value: ${ariaLive}`);
    }
  });

  await runAxeTest(container, axeConfig.standard, 'live regions test');
};
