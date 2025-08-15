import { test, expect } from '@playwright/test';
import {
    FORM_VALIDATION_SCENARIOS,
    BET_VALIDATION_SCENARIOS,
    TRANSACTION_ERROR_SCENARIOS,
    NETWORK_ERROR_SCENARIOS,
    runValidationTests,
    runTransactionErrorTests,
    runNetworkErrorTests
} from './error-handling-framework';

/**
 * Execute comprehensive error handling tests
 *
 * Tests cover:
 * - Form and user input validation errors
 * - Transaction and wallet errors
 * - Network and API errors
 * - System and unexpected errors
 */

test.describe('Error Handling - Validation Errors', () => {
    test('Form Validation Error Scenarios', async ({ page }) => {
        await runValidationTests(page, FORM_VALIDATION_SCENARIOS);
    });

    test('Bet Validation Error Scenarios', async ({ page }) => {
        await runValidationTests(page, BET_VALIDATION_SCENARIOS);
    });
});test.describe('Error Handling - Transaction Errors', () => {
    test('Transaction Error Scenarios', async ({ page }) => {
        await runTransactionErrorTests(page, TRANSACTION_ERROR_SCENARIOS);
    });
});test.describe('Error Handling - Network Errors', () => {
    test('Network Error Scenarios', async ({ page }) => {
        await runNetworkErrorTests(page, NETWORK_ERROR_SCENARIOS);
    });
});test.describe('Error Handling - Special Cases', () => {
    test('Handling unexpected scenarios and fatal errors', async ({ page }) => {
        const unexpectedErrorScenario = {
            id: 'unexpected_error',
            name: 'Unexpected Error Handling',
            description: 'Test application response to unexpected errors',
            category: 'system',
            setup: async (page) => {
                await page.goto('/unexpected-error');
                await page.waitForLoadState('networkidle');
            },
            trigger: async (page) => {
                // Simulate unexpected JavaScript error
                await page.evaluate(() => {
                    throw new Error('Simulated Unexpected Error');
                }).catch(() => {});
            },
            verify: async (page) => {
                await expect(page.locator('.unexpected-error')).toContainText('An unexpected error occurred');
            }
        };

        const framework = new ErrorHandlingFramework(page);
        await framework.executeScenario(unexpectedErrorScenario);
    });
});
