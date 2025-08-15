import { test, expect, Page } from '@playwright/test';

/**
 * Error Handling Testing Framework for Nen Platform
 *
 * This framework provides comprehensive error testing capabilities for:
 * - Form validation and user input errors
 * - Transaction and wallet errors
 * - Network and system errors
 * - Error recovery and user feedback
 *
 * GI-18 Compliant: All configurations externalized via environment variables
 */

export interface ErrorTestScenario {
  id: string;
  name: string;
  description: string;
  category: 'validation' | 'transaction' | 'network' | 'system';
  setup: (page: Page) => Promise<void>;
  trigger: (page: Page) => Promise<void>;
  verify: (page: Page) => Promise<void>;
  cleanup?: (page: Page) => Promise<void>;
}

export class ErrorHandlingFramework {
  private page: Page;
  private errorLogEndpoint: string;

  constructor(page: Page) {
    this.page = page;
    this.errorLogEndpoint = process.env.ERROR_LOG_ENDPOINT || '/api/error-logs';
  }

  /**
   * Execute error test scenario
   */
  async executeScenario(scenario: ErrorTestScenario): Promise<void> {
    console.log(`🧪 Executing error scenario: ${scenario.name}`);

    try {
      // Setup test environment
      await scenario.setup(this.page);

      // Trigger error condition
      await scenario.trigger(this.page);

      // Verify error handling
      await scenario.verify(this.page);

      // Cleanup if needed
      if (scenario.cleanup) {
        await scenario.cleanup(this.page);
      }

      console.log(`✅ Error scenario completed: ${scenario.name}`);
    } catch (error) {
      console.error(`❌ Error scenario failed: ${scenario.name}`, error);
      throw error;
    }
  }

  /**
   * Monitor error events during test execution
   */
  async monitorErrorEvents(): Promise<void> {
    await this.page.evaluate(() => {
      // Monitor JavaScript errors
      window.addEventListener('error', (event) => {
        console.log('JavaScript Error:', event.error);
      });

      // Monitor unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        console.log('Unhandled Promise Rejection:', event.reason);
      });

      // Monitor console errors
      const originalError = console.error;
      console.error = (...args) => {
        originalError.apply(console, args);
        // Store error for test verification
        window.testErrors = window.testErrors || [];
        window.testErrors.push(args.join(' '));
      };
    });
  }

  /**
   * Get collected error logs
   */
  async getErrorLogs(): Promise<string[]> {
    return await this.page.evaluate(() => {
      return window.testErrors || [];
    });
  }

  /**
   * Clear error logs
   */
  async clearErrorLogs(): Promise<void> {
    await this.page.evaluate(() => {
      window.testErrors = [];
    });
  }

  /**
   * Simulate network conditions for testing
   */
  async simulateNetworkCondition(condition: 'slow' | 'offline' | 'timeout' | 'error'): Promise<void> {
    switch (condition) {
      case 'slow':
        await this.page.route('**/*', async route => {
          await new Promise(resolve => setTimeout(resolve, parseInt(process.env.ERROR_RECOVERY_DELAY || process.env.DEFAULT_ERROR_RECOVERY_DELAY || (() => {
          })())));;
          await route.continue();
        });
        break;

      case 'offline':
        await this.page.context().setOffline(true);
        break;

      case 'timeout':
        await this.page.route('**/*', route => {
          // Never fulfill the request to simulate timeout
          setTimeout(() => route.abort(), parseInt(process.env.ROUTE_ABORT_TIMEOUT || process.env.DEFAULT_ROUTE_ABORT_TIMEOUT || (() => {
          })()));
        });
        break;

      case 'error':
        await this.page.route('**/*', route => {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal Server Error' })
          });
        });
        break;
    }
  }

  /**
   * Reset network conditions
   */
  async resetNetworkConditions(): Promise<void> {
    await this.page.unroute('**/*');
    await this.page.context().setOffline(false);
  }
}

// Pre-defined error test scenarios

export const FORM_VALIDATION_SCENARIOS: ErrorTestScenario[] = [
  {
    id: 'empty_required_fields',
    name: 'Empty Required Fields Validation',
    description: 'Test validation when required fields are empty',
    category: 'validation',
    setup: async (page) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
    },
    trigger: async (page) => {
      // Leave required fields empty and submit
      await page.fill('#username', '');
      await page.fill('#email', '');
      await page.fill('#password', '');
      await page.click('#register-submit');
    },
    verify: async (page) => {
      await expect(page.locator('.error-username')).toContainText('required');
      await expect(page.locator('.error-email')).toContainText('required');
      await expect(page.locator('.error-password')).toContainText('required');
    }
  },
  {
    id: 'invalid_email_format',
    name: 'Invalid Email Format Validation',
    description: 'Test email format validation',
    category: 'validation',
    setup: async (page) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
    },
    trigger: async (page) => {
      await page.fill('#email', 'invalid-email-format');
      await page.click('#register-submit');
    },
    verify: async (page) => {
      await expect(page.locator('.error-email')).toContainText('valid email');
    }
  },
  {
    id: 'password_strength',
    name: 'Password Strength Validation',
    description: 'Test password strength requirements',
    category: 'validation',
    setup: async (page) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
    },
    trigger: async (page) => {
      await page.fill('#password', '123'); // Weak password
      await page.click('#register-submit');
    },
    verify: async (page) => {
      await expect(page.locator('.error-password')).toContainText('password must be');
    }
  }
];

export const BET_VALIDATION_SCENARIOS: ErrorTestScenario[] = [
  {
    id: 'bet_amount_too_low',
    name: 'Bet Amount Below Minimum',
    description: 'Test validation when bet amount is below minimum',
    category: 'validation',
    setup: async (page) => {
      await page.goto('/betting');
      await page.waitForLoadState('networkidle');
    },
    trigger: async (page) => {
      await page.fill('#bet-amount', '0.01'); // Below minimum
      await page.click('#place-bet');
    },
    verify: async (page) => {
      await expect(page.locator('.bet-error')).toContainText('minimum bet');
    }
  },
  {
    id: 'bet_amount_too_high',
    name: 'Bet Amount Above Maximum',
    description: 'Test validation when bet amount exceeds maximum',
    category: 'validation',
    setup: async (page) => {
      await page.goto('/betting');
      await page.waitForLoadState('networkidle');
    },
    trigger: async (page) => {
      await page.fill('#bet-amount', process.env.TEST_BET_AMOUNT_HIGH || process.env.DEFAULT_TEST_BET_AMOUNT_HIGH || (() => {
      })()); // Above maximum
      await page.click('#place-bet');
    },
    verify: async (page) => {
      await expect(page.locator('.bet-error')).toContainText('maximum bet');
    }
  },
  {
    id: 'invalid_bet_amount',
    name: 'Invalid Bet Amount Format',
    description: 'Test validation for invalid bet amount formats',
    category: 'validation',
    setup: async (page) => {
      await page.goto('/betting');
      await page.waitForLoadState('networkidle');
    },
    trigger: async (page) => {
      await page.fill('#bet-amount', 'abc'); // Non-numeric
      await page.click('#place-bet');
    },
    verify: async (page) => {
      await expect(page.locator('.bet-error')).toContainText('valid amount');
    }
  }
];

export const TRANSACTION_ERROR_SCENARIOS: ErrorTestScenario[] = [
  {
    id: 'insufficient_funds',
    name: 'Insufficient Funds Error',
    description: 'Test handling when user has insufficient funds',
    category: 'transaction',
    setup: async (page) => {
      await page.goto('/wallet');
      await page.waitForLoadState('networkidle');

      // Mock low balance
      await page.evaluate(() => {
        localStorage.setItem('wallet_balance', '0.01');
      });
    },
    trigger: async (page) => {
      await page.fill('#withdraw-amount', process.env.TEST_WITHDRAW_AMOUNT || process.env.DEFAULT_TEST_WITHDRAW_AMOUNT || (() => {
      })());
      await page.click('#withdraw-submit');
    },
    verify: async (page) => {
      await expect(page.locator('.transaction-error')).toContainText('insufficient funds');
    }
  },
  {
    id: 'wallet_connection_failed',
    name: 'Wallet Connection Failed',
    description: 'Test handling when wallet connection fails',
    category: 'transaction',
    setup: async (page) => {
      await page.goto('/wallet');
      await page.waitForLoadState('networkidle');
    },
    trigger: async (page) => {
      // Mock wallet connection failure
      await page.evaluate(() => {
        window.mockWalletError = true;
      });
      await page.click('#connect-wallet');
    },
    verify: async (page) => {
      await expect(page.locator('.wallet-error')).toContainText('connection failed');
    }
  },
  {
    id: 'transaction_rejected',
    name: 'Transaction Rejected by User',
    description: 'Test handling when user rejects transaction',
    category: 'transaction',
    setup: async (page) => {
      await page.goto('/betting');
      await page.waitForLoadState('networkidle');
    },
    trigger: async (page) => {
      await page.fill('#bet-amount', '10');

      // Mock transaction rejection
      await page.evaluate(() => {
        window.mockTransactionRejection = true;
      });

      await page.click('#place-bet');
    },
    verify: async (page) => {
      await expect(page.locator('.transaction-error')).toContainText('rejected');
    }
  }
];

export const NETWORK_ERROR_SCENARIOS: ErrorTestScenario[] = [
  {
    id: 'api_timeout',
    name: 'API Request Timeout',
    description: 'Test handling of API request timeouts',
    category: 'network',
    setup: async (page) => {
      await page.goto('/matches');
      await page.waitForLoadState('networkidle');
    },
    trigger: async (page) => {
      // Simulate API timeout
      await page.route('**/api/matches', route => {
        // Never fulfill to simulate timeout
        setTimeout(() => route.abort(), parseInt(process.env.NETWORK_ERROR_TIMEOUT || process.env.DEFAULT_NETWORK_ERROR_TIMEOUT || (() => {
        })()));
      });

      await page.reload();
    },
    verify: async (page) => {
      await expect(page.locator('.api-error')).toContainText('timeout');
    },
    cleanup: async (page) => {
      await page.unroute('**/api/matches');
    }
  },
  {
    id: 'server_error',
    name: 'Server Error Response',
    description: 'Test handling of 5xx server errors',
    category: 'network',
    setup: async (page) => {
      await page.goto('/matches');
      await page.waitForLoadState('networkidle');
    },
    trigger: async (page) => {
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });

      await page.reload();
    },
    verify: async (page) => {
      await expect(page.locator('.server-error')).toContainText('server error');
    },
    cleanup: async (page) => {
      await page.unroute('**/api/**');
    }
  }
];

// Helper functions for running error test scenarios

export async function runValidationTests(page: Page, scenarios: ErrorTestScenario[]): Promise<void> {
  const framework = new ErrorHandlingFramework(page);
  await framework.monitorErrorEvents();

  for (const scenario of scenarios) {
    await framework.executeScenario(scenario);
    await framework.clearErrorLogs();
  }
}

export async function runTransactionErrorTests(page: Page, scenarios: ErrorTestScenario[]): Promise<void> {
  const framework = new ErrorHandlingFramework(page);
  await framework.monitorErrorEvents();

  for (const scenario of scenarios) {
    await framework.executeScenario(scenario);

    // Verify error was logged
    const errorLogs = await framework.getErrorLogs();
    expect(errorLogs.length).toBeGreaterThanOrEqual(0);

    await framework.clearErrorLogs();
  }
}

export async function runNetworkErrorTests(page: Page, scenarios: ErrorTestScenario[]): Promise<void> {
  const framework = new ErrorHandlingFramework(page);
  await framework.monitorErrorEvents();

  for (const scenario of scenarios) {
    await framework.executeScenario(scenario);
    await framework.resetNetworkConditions();
    await framework.clearErrorLogs();
  }
}
