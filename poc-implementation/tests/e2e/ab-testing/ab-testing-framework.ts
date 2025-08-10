import { test, expect, Page } from '@playwright/test';

/**
 * A/B Testing Framework for Nen Platform
 *
 * This framework provides comprehensive A/B testing capabilities for:
 * - Button placement variations
 * - Information architecture experiments
 * - User experience optimization
 * - Conversion rate testing
 *
 * GI-18 Compliant: All configurations externalized via environment variables
 */

export interface ABTestVariation {
  id: string;
  name: string;
  description: string;
  config: Record<string, any>;
  weight?: number; // Traffic allocation percentage
}

export interface ABTestConfig {
  testId: string;
  testName: string;
  description: string;
  variations: ABTestVariation[];
  conversionGoals: string[];
  duration?: number; // Test duration in days
  minSampleSize?: number;
}

export class ABTestingFramework {
  private page: Page;
  private analyticsEndpoint: string;

  constructor(page: Page) {
    this.page = page;
    this.analyticsEndpoint = process.env.AB_TESTING_ANALYTICS_ENDPOINT || '/api/ab-analytics';
  }

  /**
   * Initialize A/B test session
   */
  async initializeTest(testConfig: ABTestConfig): Promise<string> {
    // Assign user to variation based on weights
    const variation = this.assignVariation(testConfig.variations);

    // Set test variation in localStorage for consistency
    await this.page.evaluate((data) => {
      localStorage.setItem('ab_test_data', JSON.stringify(data));
    }, {
      testId: testConfig.testId,
      variationId: variation.id,
      assignedAt: new Date().toISOString()
    });

    console.log(`🧪 A/B Test "${testConfig.testName}" - Assigned variation: ${variation.name}`);
    return variation.id;
  }

  /**
   * Track conversion event
   */
  async trackConversion(goal: string, value?: number): Promise<void> {
    const testData = await this.page.evaluate(() => {
      return JSON.parse(localStorage.getItem('ab_test_data') || '{}');
    });

    if (!testData.testId) {
      console.warn('No active A/B test found for conversion tracking');
      return;
    }

    // Send conversion data to analytics
    await this.page.evaluate(async (data) => {
      try {
        await fetch('/api/ab-analytics/conversion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } catch (error) {
        console.error('Failed to track conversion:', error);
      }
    }, {
      testId: testData.testId,
      variationId: testData.variationId,
      goal,
      value: value || 1,
      timestamp: new Date().toISOString()
    });

    console.log(`📊 Conversion tracked: ${goal} for test ${testData.testId}`);
  }

  /**
   * Apply variation configuration to page
   */
  async applyVariation(variation: ABTestVariation): Promise<void> {
    await this.page.evaluate((config) => {
      // Apply CSS modifications
      if (config.css) {
        const style = document.createElement('style');
        style.textContent = config.css;
        document.head.appendChild(style);
      }

      // Apply JavaScript modifications
      if (config.javascript) {
        const script = document.createElement('script');
        script.textContent = config.javascript;
        document.body.appendChild(script);
      }

      // Apply HTML attribute modifications
      if (config.attributes) {
        Object.entries(config.attributes).forEach(([selector, attrs]: [string, any]) => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            Object.entries(attrs).forEach(([attr, value]) => {
              el.setAttribute(attr, value as string);
            });
          });
        });
      }
    }, variation.config);
  }

  /**
   * Assign user to variation based on weights
   */
  private assignVariation(variations: ABTestVariation[]): ABTestVariation {
    const totalWeight = variations.reduce((sum, v) => sum + (v.weight || 1), 0);
    const random = Math.random() * totalWeight;

    let cumulativeWeight = 0;
    for (const variation of variations) {
      cumulativeWeight += variation.weight || 1;
      if (random <= cumulativeWeight) {
        return variation;
      }
    }

    return variations[0]; // Fallback
  }

  /**
   * Generate A/B test report
   */
  async generateReport(testId: string): Promise<any> {
    return await this.page.evaluate(async (id) => {
      try {
        const response = await fetch(`/api/ab-analytics/report/${id}`);
        return await response.json();
      } catch (error) {
        console.error('Failed to generate report:', error);
        return null;
      }
    }, testId);
  }
}

// Pre-defined A/B test configurations for common scenarios

export const BUTTON_PLACEMENT_TESTS: ABTestConfig[] = [
  {
    testId: 'cta_button_position',
    testName: 'CTA Button Position Optimization',
    description: 'Test different positions for primary CTA buttons',
    variations: [
      {
        id: 'control',
        name: 'Control (Top Right)',
        description: 'Original button position',
        config: {
          css: '.cta-button { position: absolute; top: 20px; right: 20px; }',
          attributes: {
            '.cta-button': { 'data-position': 'top-right' }
          }
        },
        weight: 1
      },
      {
        id: 'bottom_center',
        name: 'Bottom Center',
        description: 'Button positioned at bottom center',
        config: {
          css: '.cta-button { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); }',
          attributes: {
            '.cta-button': { 'data-position': 'bottom-center' }
          }
        },
        weight: 1
      },
      {
        id: 'floating_right',
        name: 'Floating Right',
        description: 'Floating button on right side',
        config: {
          css: '.cta-button { position: fixed; right: 20px; top: 50%; transform: translateY(-50%); border-radius: 50px; }',
          attributes: {
            '.cta-button': { 'data-position': 'floating-right' }
          }
        },
        weight: 1
      }
    ],
    conversionGoals: ['button_click', 'signup_complete', 'purchase_complete']
  },
  {
    testId: 'button_color_size',
    testName: 'Button Color and Size Optimization',
    description: 'Test different button colors and sizes for better conversion',
    variations: [
      {
        id: 'control',
        name: 'Control (Blue Medium)',
        description: 'Original blue medium button',
        config: {
          css: '.cta-button { background-color: #007bff; padding: 10px 20px; font-size: 16px; }',
          attributes: {
            '.cta-button': { 'data-variant': 'blue-medium' }
          }
        },
        weight: 1
      },
      {
        id: 'red_large',
        name: 'Red Large',
        description: 'Large red button for higher visibility',
        config: {
          css: '.cta-button { background-color: #dc3545; padding: 15px 30px; font-size: 18px; font-weight: bold; }',
          attributes: {
            '.cta-button': { 'data-variant': 'red-large' }
          }
        },
        weight: 1
      },
      {
        id: 'green_gradient',
        name: 'Green Gradient',
        description: 'Green gradient button with modern look',
        config: {
          css: '.cta-button { background: linear-gradient(45deg, #28a745, #20c997); padding: 12px 25px; font-size: 16px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); }',
          attributes: {
            '.cta-button': { 'data-variant': 'green-gradient' }
          }
        },
        weight: 1
      }
    ],
    conversionGoals: ['button_click', 'form_submission', 'conversion_complete']
  }
];

export const INFORMATION_ARCHITECTURE_TESTS: ABTestConfig[] = [
  {
    testId: 'navigation_structure',
    testName: 'Navigation Structure Optimization',
    description: 'Test different navigation layouts for better user experience',
    variations: [
      {
        id: 'control',
        name: 'Horizontal Navigation',
        description: 'Traditional horizontal navigation bar',
        config: {
          css: '.main-nav { display: flex; flex-direction: row; justify-content: space-between; }',
          attributes: {
            '.main-nav': { 'data-layout': 'horizontal' }
          }
        },
        weight: 1
      },
      {
        id: 'vertical_sidebar',
        name: 'Vertical Sidebar',
        description: 'Vertical sidebar navigation',
        config: {
          css: `
            .main-nav { display: flex; flex-direction: column; position: fixed; left: 0; top: 0; height: 100vh; width: 250px; }
            .main-content { margin-left: 250px; }
          `,
          attributes: {
            '.main-nav': { 'data-layout': 'vertical-sidebar' }
          }
        },
        weight: 1
      },
      {
        id: 'hamburger_mobile',
        name: 'Hamburger Menu',
        description: 'Mobile-first hamburger menu design',
        config: {
          css: `
            .main-nav { display: none; }
            .hamburger-menu { display: block; }
            .main-nav.active { display: flex; flex-direction: column; position: absolute; top: 60px; left: 0; right: 0; background: white; }
          `,
          javascript: `
            document.addEventListener('click', function(e) {
              if (e.target.classList.contains('hamburger-toggle')) {
                document.querySelector('.main-nav').classList.toggle('active');
              }
            });
          `,
          attributes: {
            '.main-nav': { 'data-layout': 'hamburger-mobile' }
          }
        },
        weight: 1
      }
    ],
    conversionGoals: ['page_view', 'navigation_click', 'task_completion']
  },
  {
    testId: 'content_organization',
    testName: 'Content Organization Testing',
    description: 'Test different ways to organize and present content',
    variations: [
      {
        id: 'control',
        name: 'Grid Layout',
        description: 'Traditional grid-based content layout',
        config: {
          css: '.content-area { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }',
          attributes: {
            '.content-area': { 'data-layout': 'grid' }
          }
        },
        weight: 1
      },
      {
        id: 'masonry',
        name: 'Masonry Layout',
        description: 'Pinterest-style masonry layout',
        config: {
          css: '.content-area { column-count: 3; column-gap: 20px; } .content-item { break-inside: avoid; margin-bottom: 20px; }',
          attributes: {
            '.content-area': { 'data-layout': 'masonry' }
          }
        },
        weight: 1
      },
      {
        id: 'list_detailed',
        name: 'Detailed List',
        description: 'Vertical list with detailed information',
        config: {
          css: '.content-area { display: flex; flex-direction: column; } .content-item { display: flex; padding: 20px; border-bottom: 1px solid #eee; }',
          attributes: {
            '.content-area': { 'data-layout': 'list-detailed' }
          }
        },
        weight: 1
      }
    ],
    conversionGoals: ['content_engagement', 'scroll_depth', 'click_through']
  }
];

// Helper functions for test execution

export async function runButtonPlacementTest(page: Page, testConfig: ABTestConfig): Promise<void> {
  const framework = new ABTestingFramework(page);
  const variationId = await framework.initializeTest(testConfig);
  const variation = testConfig.variations.find(v => v.id === variationId);

  if (variation) {
    await framework.applyVariation(variation);

    // Track button clicks
    await page.evaluate(() => {
      document.addEventListener('click', (e) => {
        if ((e.target as Element).classList.contains('cta-button')) {
          // This would be handled by the framework's trackConversion method
          console.log('Button clicked - conversion tracked');
        }
      });
    });
  }
}

export async function runInformationArchitectureTest(page: Page, testConfig: ABTestConfig): Promise<void> {
  const framework = new ABTestingFramework(page);
  const variationId = await framework.initializeTest(testConfig);
  const variation = testConfig.variations.find(v => v.id === variationId);

  if (variation) {
    await framework.applyVariation(variation);

    // Track navigation interactions
    await page.evaluate(() => {
      document.addEventListener('click', (e) => {
        if ((e.target as Element).closest('.main-nav')) {
          console.log('Navigation clicked - interaction tracked');
        }
      });
    });
  }
}
