// Import commands.js using ES2015 syntax
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Global configuration for Cypress
Cypress.config('defaultCommandTimeout', 10000);
Cypress.config('requestTimeout', 10000);
Cypress.config('responseTimeout', 10000);

// Handle uncaught exceptions to prevent test failures
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  return false;
});
