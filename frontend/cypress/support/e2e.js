// Import commands
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR requests from the Command Log
const app = window.top
if (!app.document.head.querySelector('[data-hide-command-log-request]')) {
  const style = app.document.createElement('style')
  style.innerHTML = '.command-name-request, .command-name-xhr { display: none }'
  style.setAttribute('data-hide-command-log-request', '')
  app.document.head.appendChild(style)
}

// Cypress global configuration
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing on uncaught exceptions
  // that are expected in the application (like wallet connection errors)
  if (err.message.includes('wallet') || err.message.includes('connection')) {
    return false
  }
  return true
})

// Setup for mobile testing
beforeEach(() => {
  // Wait for page to load
  cy.visit('/', { failOnStatusCode: false })
})
