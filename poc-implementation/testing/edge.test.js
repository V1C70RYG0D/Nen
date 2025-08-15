import { test, expect } from '@playwright/test';

require('dotenv').config({ path: require('path').join(__dirname, '../config', '.env') });

test.describe('Edge Full Compatibility Tests', () => {
    test.beforeEach(async ({ page }) => {
        const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || `http://${process.env.DEV_FRONTEND_HOST || 'localhost'}:${process.env.DEV_FRONTEND_PORT || '3000'}`;
        await page.goto(frontendUrl);
    });

    test('Test full compatibility on Edge 90+', async ({ page }) => {
        // Add full compatibility tests here.
        const expectedTitle = process.env.APP_TITLE || process.env.PROJECT_NAME || 'Nen Platform';
        expect(await page.title()).toContain(expectedTitle);
    });
});

