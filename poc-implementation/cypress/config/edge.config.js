const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    browser: 'edge',
    specPattern: 'cypress/e2e/edge-*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/index.js',
    video: true,
    videosFolder: 'cypress/videos/edge',
    screenshotsFolder: 'cypress/screenshots/edge',
    viewportWidth: 1920,
    viewportHeight: 1080,
    chromeWebSecurity: false,
    setupNodeEvents(on, config) {
      // Edge-specific configurations
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'edge') {
          launchOptions.args.push('--disable-dev-shm-usage');
          launchOptions.args.push('--disable-gpu');
          launchOptions.args.push('--no-sandbox');
          launchOptions.args.push('--window-size=1920,1080');
        }
        return launchOptions;
      });
    }
  },
  env: {
    BROWSER: 'Edge 90+',
    TEST_FOCUS: 'full-compatibility'
  }
});
