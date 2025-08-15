// Example page object for the login page
import { Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(process.env.PLAYWRIGHT_BASE_URL + '/login');
  }

  async login(username: string, password: string) {
    await this.page.fill('#username', username);
    await this.page.fill('#password', password);
    await this.page.click('#login-button');
  }

  async isLoggedIn(): Promise<boolean> {
    return await this.page.isVisible('#logout-button');
  }
}

