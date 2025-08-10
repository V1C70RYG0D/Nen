import { test, expect } from '@playwright/test';

const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || `http://${process.env.DEV_FRONTEND_HOST || 'localhost'}:${process.env.DEV_FRONTEND_PORT || '3000'}`;

test.describe('Safari Gameboard Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(frontendUrl);
    });

    test('Test gameboard functionalities on Safari 14+', async ({ page }) => {
        // Add specific gameboard tests here.
        expect(await page.title()).toBe('Your App Title');
    });
});

