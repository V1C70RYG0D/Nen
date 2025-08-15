import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // Implement node event listeners here
    },
    specPattern: 'cypress/e2e*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/index.js',
    video: false
  },
  // Reporter configuration
  reporter: 'cypress-multi-reporters',
  reporterOptions: {
    configFile: 'config/reporter-config.json'
  },
  env: {
    FAIL_FAST_PLUGIN: 'false'
  }
});

