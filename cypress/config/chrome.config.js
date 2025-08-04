const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    browser: 'chrome',
    specPattern: 'cypress/e2e/chrome-*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/index.js',
    video: true,
    videosFolder: 'cypress/videos/chrome',
    screenshotsFolder: 'cypress/screenshots/chrome',
    viewportWidth: 1920,
    viewportHeight: 1080,
    chromeWebSecurity: false,
    setupNodeEvents(on, config) {
      // Chrome-specific configurations
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'chrome') {
          launchOptions.args.push('--disable-dev-shm-usage');
          launchOptions.args.push('--disable-gpu');
          launchOptions.args.push('--no-sandbox');
          launchOptions.args.push('--window-size=1920,1080');
          launchOptions.args.push('--force-device-scale-factor=1');
        }
        return launchOptions;
      });
    },
  },
  env: {
    BROWSER: 'Chrome 90+',
    TEST_FEATURES: 'all',
  },
});
