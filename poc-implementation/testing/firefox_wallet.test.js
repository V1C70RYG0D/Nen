import { test, expect } from '@playwright/test';

const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || `http://${process.env.DEV_FRONTEND_HOST || 'localhost'}:${process.env.DEV_FRONTEND_PORT || '3000'}`;

test.describe('Firefox Wallet Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(frontendUrl);
    });

    test('Test wallet integration on Firefox 88+', async ({ page }) => {
        // Add wallet integration tests here.
        expect(await page.title()).toBe('Your App Title');
    });
});

