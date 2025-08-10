import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load test data
const testWallets = JSON.parse(
  readFileSync(join(__dirname, '../test-data/test-wallets.json'), 'utf8')
);

/**
 * Wallet Connection Integration Tests
 * Tests Solana wallet integration, connection states, and transaction flows
 */
test.describe('Wallet Connection Integration Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Set up wallet mock in browser context
    await page.addInitScript(() => {
      // Mock Solana wallet adapter
      (window as any).solana = {
        isPhantom: true,
        connect: async () => ({
          publicKey: {
            toString: () => 'test-wallet-address-123'
          }
        }),
        disconnect: async () => {},
        signTransaction: async (transaction: any) => transaction,
        signAllTransactions: async (transactions: any[]) => transactions,
        on: (event: string, callback: Function) => {},
        off: (event: string, callback: Function) => {},
      };
    });

    await page.goto('/', { waitUntil: 'networkidle' });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should display wallet connection button on page load', async () => {
    // Check for wallet connect button presence
    const connectButton = page.locator('[data-testid="wallet-connect-button"]');
    await expect(connectButton).toBeVisible();
    await expect(connectButton).toContainText('Connect Wallet');
  });

  test('should successfully connect to mock Phantom wallet', async () => {
    // Click connect wallet button
    await page.click('[data-testid="wallet-connect-button"]');

    // Select Phantom wallet from options
    const phantomOption = page.locator('[data-testid="phantom-wallet-option"]');
    if (await phantomOption.isVisible()) {
      await phantomOption.click();
    }

    // Wait for connection to complete
    await page.waitForSelector('[data-testid="wallet-connected-indicator"]', {
      timeout: 10000
    });

    // Verify connection state
    const walletAddress = page.locator('[data-testid="wallet-address-display"]');
    await expect(walletAddress).toBeVisible();
    await expect(walletAddress).toContainText('test-wallet-address-123');

    // Verify disconnect button is now available
    const disconnectButton = page.locator('[data-testid="wallet-disconnect-button"]');
    await expect(disconnectButton).toBeVisible();
  });

  test('should handle wallet connection failure gracefully', async () => {
    // Override wallet mock to simulate connection failure
    await page.addInitScript(() => {
      (window as any).solana.connect = async () => {
        throw new Error('User rejected the request');
      };
    });

    await page.reload({ waitUntil: 'networkidle' });

    // Attempt to connect
    await page.click('[data-testid="wallet-connect-button"]');

    // Check for error message
    const errorMessage = page.locator('[data-testid="wallet-error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(errorMessage).toContainText('connection failed');
  });

  test('should disconnect wallet successfully', async () => {
    // First connect the wallet
    await page.click('[data-testid="wallet-connect-button"]');
    await page.waitForSelector('[data-testid="wallet-connected-indicator"]');

    // Then disconnect
    await page.click('[data-testid="wallet-disconnect-button"]');

    // Verify disconnection
    await expect(page.locator('[data-testid="wallet-connect-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="wallet-address-display"]')).not.toBeVisible();
  });

  test('should display correct wallet balance after connection', async () => {
    // Mock balance response
    await page.route('**/api/wallet/balance', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ balance: 1.5, currency: 'SOL' })
      });
    });

    // Connect wallet
    await page.click('[data-testid="wallet-connect-button"]');
    await page.waitForSelector('[data-testid="wallet-connected-indicator"]');

    // Check balance display
    const balanceDisplay = page.locator('[data-testid="wallet-balance-display"]');
    await expect(balanceDisplay).toBeVisible();
    await expect(balanceDisplay).toContainText('1.5 SOL');
  });

  test('should handle multiple wallet types', async () => {
    const walletTypes = ['phantom', 'solflare', 'sollet'];

    for (const walletType of walletTypes) {
      // Mock different wallet types
      await page.addInitScript((type) => {
        (window as any).solana = {
          [`is${type.charAt(0).toUpperCase() + type.slice(1)}`]: true,
          connect: async () => ({
            publicKey: {
              toString: () => `${type}-wallet-address-123`
            }
          }),
          disconnect: async () => {},
        };
      }, walletType);

      await page.reload({ waitUntil: 'networkidle' });

      // Test connection for each wallet type
      await page.click('[data-testid="wallet-connect-button"]');

      const walletOption = page.locator(`[data-testid="${walletType}-wallet-option"]`);
      if (await walletOption.isVisible()) {
        await walletOption.click();

        await page.waitForSelector('[data-testid="wallet-connected-indicator"]');

        const addressDisplay = page.locator('[data-testid="wallet-address-display"]');
        await expect(addressDisplay).toContainText(`${walletType}-wallet-address-123`);

        // Disconnect for next iteration
        await page.click('[data-testid="wallet-disconnect-button"]');
        await page.waitForSelector('[data-testid="wallet-connect-button"]');
      }
    }
  });

  test('should persist wallet connection across page reloads', async () => {
    // Mock localStorage for wallet persistence
    await page.addInitScript(() => {
      localStorage.setItem('walletAdapter', JSON.stringify({
        connected: true,
        publicKey: 'test-wallet-address-123'
      }));
    });

    // Connect wallet
    await page.click('[data-testid="wallet-connect-button"]');
    await page.waitForSelector('[data-testid="wallet-connected-indicator"]');

    // Reload page
    await page.reload({ waitUntil: 'networkidle' });

    // Check if wallet connection persisted
    const addressDisplay = page.locator('[data-testid="wallet-address-display"]');
    await expect(addressDisplay).toBeVisible();
    await expect(addressDisplay).toContainText('test-wallet-address-123');
  });

  test('should handle wallet transaction signing', async () => {
    // Connect wallet first
    await page.click('[data-testid="wallet-connect-button"]');
    await page.waitForSelector('[data-testid="wallet-connected-indicator"]');

    // Mock transaction signing
    await page.addInitScript(() => {
      (window as any).solana.signTransaction = async (transaction: any) => {
        return { ...transaction, signature: 'mock-signature-123' };
      };
    });

    // Trigger a transaction (e.g., placing a bet)
    const betButton = page.locator('[data-testid="place-bet-button"]');
    if (await betButton.isVisible()) {
      await betButton.click();

      // Wait for transaction confirmation
      const txConfirmation = page.locator('[data-testid="transaction-confirmation"]');
      await expect(txConfirmation).toBeVisible({ timeout: 10000 });
      await expect(txConfirmation).toContainText('Transaction successful');
    }
  });

  test('should handle network switching', async () => {
    // Connect wallet
    await page.click('[data-testid="wallet-connect-button"]');
    await page.waitForSelector('[data-testid="wallet-connected-indicator"]');

    // Check network indicator
    const networkIndicator = page.locator('[data-testid="network-indicator"]');
    await expect(networkIndicator).toBeVisible();

    // Test network switching if available
    const networkSelector = page.locator('[data-testid="network-selector"]');
    if (await networkSelector.isVisible()) {
      await networkSelector.click();

      const devnetOption = page.locator('[data-testid="devnet-option"]');
      if (await devnetOption.isVisible()) {
        await devnetOption.click();
        await expect(networkIndicator).toContainText('devnet');
      }
    }
  });

  test('should display transaction history', async () => {
    // Mock transaction history API
    await page.route('**/api/wallet/transactions', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          transactions: [
            {
              signature: 'tx1-signature',
              type: 'bet',
              amount: 0.1,
              status: 'confirmed',
              timestamp: Date.now()
            },
            {
              signature: 'tx2-signature',
              type: 'withdrawal',
              amount: 0.5,
              status: 'confirmed',
              timestamp: Date.now() - 3600000
            }
          ]
        })
      });
    });

    // Connect wallet
    await page.click('[data-testid="wallet-connect-button"]');
    await page.waitForSelector('[data-testid="wallet-connected-indicator"]');

    // Open transaction history
    const historyButton = page.locator('[data-testid="transaction-history-button"]');
    if (await historyButton.isVisible()) {
      await historyButton.click();

      // Verify transaction list
      const transactionList = page.locator('[data-testid="transaction-list"]');
      await expect(transactionList).toBeVisible();

      const transactions = page.locator('[data-testid^="transaction-item-"]');
      await expect(transactions).toHaveCount(2);
    }
  });
});
