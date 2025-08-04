import { Page, expect } from '@playwright/test';

/**
 * Utility function to connect to a wallet.
 */
export async function connectWallet(page: Page, walletType: string = 'phantom') {
  await page.click('[data-testid="wallet-connect-button"]');
  const walletOption = page.locator(`[data-testid="${walletType}-wallet-option"]`);
  if (await walletOption.isVisible()) {
    await walletOption.click();
    await page.waitForSelector('[data-testid="wallet-connected-indicator"]');
  }
}

/**
 * Utility function to disconnect from a wallet.
 */
export async function disconnectWallet(page: Page) {
  await page.click('[data-testid="wallet-disconnect-button"]');
  await expect(page.locator('[data-testid="wallet-connect-button"]')).toBeVisible();
}

/**
 * Utility function to perform KYC verification.
 */
export async function performKYCVerification(page: Page, userDetails: object) {
  // Navigate to KYC section
  await page.goto('/kyc');
  // Fill in the KYC details
  for (const [key, value] of Object.entries(userDetails)) {
    await page.fill(`[data-testid="kyc-${key}"]`, value.toString());
  }
  // Submit KYC form
  await page.click('[data-testid="submit-kyc-button"]');
  // Wait for completion
  await page.waitForSelector('[data-testid="kyc-success"]');
}

/**
 * Utility function to deposit SOL.
 */
export async function depositSOL(page: Page, amount: number) {
  await page.click('[data-testid="wallet-deposit-button"]');
  await page.fill('[data-testid="deposit-amount"]', amount.toString());
  await page.click('[data-testid="confirm-deposit-button"]');
  await page.waitForSelector('[data-testid="deposit-success"]');
}

