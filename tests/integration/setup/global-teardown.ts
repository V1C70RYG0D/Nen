import { Browser, Page } from 'playwright';

// Global teardown for integration tests
async function globalTeardown(browser: Browser, page: Page) {
  console.log('🧹 Cleaning up integration test environment...');

  // Close browser
  if (browser) {
    await browser.close();
  }

  console.log('✅ Integration test environment cleanup complete!');
}

export default globalTeardown;
