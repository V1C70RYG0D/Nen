import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AuthPage extends BasePage {
  // Selectors
  private readonly usernameInput = '[data-testid="username-input"]';
  private readonly passwordInput = '[data-testid="password-input"]';
  private readonly emailInput = '[data-testid="email-input"]';
  private readonly loginButton = '[data-testid="login-button"]';
  private readonly registerButton = '[data-testid="register-button"]';
  private readonly logoutButton = '[data-testid="logout-button"]';
  private readonly forgotPasswordLink = '[data-testid="forgot-password-link"]';
  private readonly walletConnectButton = '[data-testid="wallet-connect-button"]';
  private readonly errorMessage = '[data-testid="error-message"]';
  private readonly successMessage = '[data-testid="success-message"]';
  private readonly loadingSpinner = '[data-testid="loading-spinner"]';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to login page
   */
  async gotoLogin() {
    await this.goto('/login');
    await this.waitForElement(this.loginButton);
  }

  /**
   * Navigate to register page
   */
  async gotoRegister() {
    await this.goto('/register');
    await this.waitForElement(this.registerButton);
  }

  /**
   * Perform login with credentials
   */
  async login(username: string, password: string) {
    await this.fillField(this.usernameInput, username);
    await this.fillField(this.passwordInput, password);
    await this.clickElement(this.loginButton);

    // Wait for either success redirect or error message
    await Promise.race([
      this.page.waitForURL(/\/dashboard/, { timeout: 10000 }),
      this.waitForElement(this.errorMessage, 5000)
    ]);
  }

  /**
   * Register new user account
   */
  async register(username: string, email: string, password: string) {
    await this.fillField(this.usernameInput, username);
    await this.fillField(this.emailInput, email);
    await this.fillField(this.passwordInput, password);
    await this.clickElement(this.registerButton);

    // Wait for registration completion
    await Promise.race([
      this.waitForElement(this.successMessage, 10000),
      this.waitForElement(this.errorMessage, 5000)
    ]);
  }

  /**
   * Connect wallet for blockchain authentication
   */
  async connectWallet() {
    await this.clickElement(this.walletConnectButton);

    // Handle wallet popup if it appears
    await this.page.waitForTimeout(2000);

    // Check if wallet connection was successful
    const isConnected = await this.isElementVisible('[data-testid="wallet-connected"]');
    return isConnected;
  }

  /**
   * Logout from the application
   */
  async logout() {
    await this.clickElement(this.logoutButton);
    await this.page.waitForURL(/\/login/, { timeout: 10000 });
  }

  /**
   * Check if user is currently logged in
   */
  async isLoggedIn(): Promise<boolean> {
    return await this.isElementVisible(this.logoutButton);
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    if (await this.isElementVisible(this.errorMessage)) {
      return await this.getTextContent(this.errorMessage);
    }
    return '';
  }

  /**
   * Get success message text
   */
  async getSuccessMessage(): Promise<string> {
    if (await this.isElementVisible(this.successMessage)) {
      return await this.getTextContent(this.successMessage);
    }
    return '';
  }

  /**
   * Wait for login to complete
   */
  async waitForLoginComplete() {
    await this.page.waitForFunction(() => {
      return !document.querySelector('[data-testid="loading-spinner"]');
    }, { timeout: 15000 });
  }

  /**
   * Verify login page elements are present
   */
  async verifyLoginPageElements() {
    await expect(this.page.locator(this.usernameInput)).toBeVisible();
    await expect(this.page.locator(this.passwordInput)).toBeVisible();
    await expect(this.page.locator(this.loginButton)).toBeVisible();
    await expect(this.page.locator(this.forgotPasswordLink)).toBeVisible();
  }

  /**
   * Verify register page elements are present
   */
  async verifyRegisterPageElements() {
    await expect(this.page.locator(this.usernameInput)).toBeVisible();
    await expect(this.page.locator(this.emailInput)).toBeVisible();
    await expect(this.page.locator(this.passwordInput)).toBeVisible();
    await expect(this.page.locator(this.registerButton)).toBeVisible();
  }

  /**
   * Reset password flow
   */
  async requestPasswordReset(email: string) {
    await this.clickElement(this.forgotPasswordLink);
    await this.fillField(this.emailInput, email);
    await this.clickElement('[data-testid="reset-password-button"]');

    await this.waitForElement(this.successMessage, 10000);
  }

  /**
   * Verify authentication state in localStorage/sessionStorage
   */
  async verifyAuthState(shouldBeAuthenticated: boolean = true) {
    const authToken = await this.page.evaluate(() => {
      return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    });

    if (shouldBeAuthenticated) {
      expect(authToken).toBeTruthy();
    } else {
      expect(authToken).toBeFalsy();
    }
  }
}
