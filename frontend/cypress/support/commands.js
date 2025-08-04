// Custom commands for the Nen platform

// Command to mock wallet connection
Cypress.Commands.add('mockWalletConnection', (walletType = 'phantom') => {
  cy.window().then((win) => {
    // Mock Solana wallet object
    win.solana = {
      isPhantom: walletType === 'phantom',
      connect: cy.stub().resolves({
        publicKey: {
          toString: () => '11111111111111111111111111111112',
        },
      }),
      disconnect: cy.stub().resolves(),
      signTransaction: cy.stub().resolves(),
      signAllTransactions: cy.stub().resolves([]),
      on: cy.stub(),
      off: cy.stub(),
    }
  })
})

// Command to check responsive design
Cypress.Commands.add('checkResponsive', (selector) => {
  const viewports = [
    { width: 375, height: 667 }, // Mobile
    { width: 768, height: 1024 }, // Tablet
    { width: 1280, height: 720 }, // Desktop
  ]

  viewports.forEach((viewport) => {
    cy.viewport(viewport.width, viewport.height)
    cy.get(selector).should('be.visible')
  })
})

// Command to test accessibility
Cypress.Commands.add('checkA11y', (context, options) => {
  cy.injectAxe()
  cy.checkA11y(context, options)
})

// Command to wait for elements with better error messages
Cypress.Commands.add('waitForElement', (selector, timeout = 10000) => {
  cy.get(selector, { timeout }).should('exist').and('be.visible')
})

// Command to simulate betting action
Cypress.Commands.add('placeBet', (amount, team) => {
  cy.get('[data-testid="betting-panel"]').should('be.visible')
  cy.get(`[data-testid="team-${team}"]`).click()
  cy.get('[data-testid="bet-amount-input"]').type(amount.toString())
  cy.get('[data-testid="place-bet-button"]').click()
})

// Command to check wallet balance
Cypress.Commands.add('checkWalletBalance', (expectedBalance) => {
  cy.get('[data-testid="wallet-balance"]')
    .should('contain', expectedBalance)
})

// Command to navigate between game phases
Cypress.Commands.add('navigateToPhase', (phase) => {
  const phases = {
    'lobby': '[data-testid="lobby-button"]',
    'betting': '[data-testid="betting-button"]',
    'game': '[data-testid="game-button"]',
    'results': '[data-testid="results-button"]'
  }

  if (phases[phase]) {
    cy.get(phases[phase]).click()
    cy.url().should('include', phase)
  }
})

// Command to test game state changes
Cypress.Commands.add('waitForGameState', (expectedState, timeout = 10000) => {
  cy.get('[data-testid="game-state"]', { timeout })
    .should('contain', expectedState)
})
