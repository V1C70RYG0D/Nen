import { test, expect } from '@playwright/test';

const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || `http://${process.env.DEV_FRONTEND_HOST || 'localhost'}:${process.env.DEV_FRONTEND_PORT || '3000'}`;

test.describe('Chrome Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(frontendUrl);
    });

    test('Test all features on Chrome 90+', async ({ page }) => {
        // Add specific feature tests here.
        expect(await page.title()).toBe('Your App Title');
    });
});

