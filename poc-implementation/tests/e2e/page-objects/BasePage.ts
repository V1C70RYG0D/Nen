import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific URL
   */
  async goto(path: string = '') {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL;
    if (!baseUrl) {
      throw new Error('PLAYWRIGHT_BASE_URL environment variable is not set');
    }
    await this.page.goto(`${baseUrl}${path}`);
  }

  /**
   * Wait for page to be loaded
   */
  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(selector: string, timeout: number = 10000) {
    await this.page.waitForSelector(selector, { timeout, state: 'visible' });
  }

  /**
   * Fill form field with error handling
   */
  async fillField(selector: string, value: string) {
    await this.page.waitForSelector(selector);
    await this.page.fill(selector, value);
  }

  /**
   * Click element with retry logic
   */
  async clickElement(selector: string, timeout: number = 10000) {
    await this.page.waitForSelector(selector, { timeout });
    await this.page.click(selector);
  }

  /**
   * Get text content of element
   */
  async getTextContent(selector: string): Promise<string> {
    await this.page.waitForSelector(selector);
    return await this.page.textContent(selector) || '';
  }

  /**
   * Check if element is visible
   */
  async isElementVisible(selector: string): Promise<boolean> {
    try {
      const timeout = parseInt(process.env.TEST_TIMEOUT_SHORT || process.env.TEST_TIMEOUT_DEFAULT || '5000');
      await this.page.waitForSelector(selector, { timeout, state: 'visible' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Take screenshot for debugging
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true
    });
  }

  /**
   * Wait for API response
   */
  async waitForResponse(urlPattern: string | RegExp, timeout: number = 30000) {
    return await this.page.waitForResponse(urlPattern, { timeout });
  }

  /**
   * Mock API response for testing
   */
  async mockApiResponse(url: string | RegExp, response: any) {
    await this.page.route(url, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Verify page title
   */
  async verifyTitle(expectedTitle: string) {
    await expect(this.page).toHaveTitle(expectedTitle);
  }

  /**
   * Verify URL contains path
   */
  async verifyUrl(expectedPath: string) {
    await expect(this.page).toHaveURL(new RegExp(expectedPath));
  }

  /**
   * Handle dialog boxes
   */
  async handleDialog(accept: boolean = true, promptText?: string) {
    this.page.on('dialog', async dialog => {
      if (promptText) {
        await dialog.accept(promptText);
      } else if (accept) {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });
  }

  /**
   * Upload file
   */
  async uploadFile(selector: string, filePath: string) {
    await this.page.setInputFiles(selector, filePath);
  }

  /**
   * Scroll to element
   */
  async scrollToElement(selector: string) {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Get locator for element
   */
  getLocator(selector: string): Locator {
    return this.page.locator(selector);
  }

  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle');
  }
}
