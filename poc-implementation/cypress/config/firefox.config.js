const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    browser: 'firefox',
    specPattern: 'cypress/e2e/firefox-*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/index.js',
    video: true,
    videosFolder: 'cypress/videos/firefox',
    screenshotsFolder: 'cypress/screenshots/firefox',
    viewportWidth: 1920,
    viewportHeight: 1080,
    firefoxGcInterval: {
      runMode: 1,
      openMode: null
    },
    setupNodeEvents(on, config) {
      // Firefox-specific configurations
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'firefox') {
          launchOptions.preferences['dom.webnotifications.enabled'] = false;
          launchOptions.preferences['media.navigator.permission.disabled'] = true;
        }
        return launchOptions;
      });
    }
  },
  env: {
    BROWSER: 'Firefox 88+',
    TEST_FOCUS: 'wallet-integration'
  }
});
