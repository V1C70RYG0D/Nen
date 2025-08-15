// Custom commands for wallet operations
Cypress.Commands.add('connectWallet', () => {
  cy.get('[data-testid="connect-wallet-btn"]').click();
  cy.get('[data-testid="wallet-modal"]').should('be.visible');
  cy.get('[data-testid="phantom-wallet-option"]').click();
  cy.get('[data-testid="wallet-status"]').should('contain', 'Connected');
});

Cypress.Commands.add('connectWalletPhantom', () => {
  cy.get('[data-testid="connect-wallet-btn"]').click();
  cy.get('[data-testid="wallet-modal"]').should('be.visible');
  cy.get('[data-testid="phantom-wallet-option"]').click();
  cy.get('[data-testid="wallet-status"]').should('contain', 'Connected');
});

Cypress.Commands.add('connectWalletSolflare', () => {
  cy.get('[data-testid="connect-wallet-btn"]').click();
  cy.get('[data-testid="wallet-modal"]').should('be.visible');
  cy.get('[data-testid="solflare-wallet-option"]').click();
  cy.get('[data-testid="wallet-status"]').should('contain', 'Connected');
});

Cypress.Commands.add('disconnectWallet', () => {
  cy.get('[data-testid="wallet-menu"]').click();
  cy.get('[data-testid="disconnect-wallet"]').click();
  cy.get('[data-testid="wallet-status"]').should('contain', 'Not Connected');
});

// Game-related commands
Cypress.Commands.add('selectMatch', () => {
  cy.visit('/matches');
  cy.get('[data-testid="match-list"]').should('be.visible');
  cy.get('[data-testid="match-card"]').first().click();
  cy.get('[data-testid="match-details"]').should('be.visible');
});

Cypress.Commands.add('placeBet', () => {
  cy.get('[data-testid="bet-section"]').should('be.visible');
  cy.get('[data-testid="bet-amount"]').type('1');
  cy.get('[data-testid="bet-team-a"]').click();
  cy.get('[data-testid="place-bet-btn"]').click();
  cy.get('[data-testid="bet-confirmation-modal"]').should('be.visible');
  cy.get('[data-testid="confirm-bet"]').click();
});

Cypress.Commands.add('verifyBetPlacement', () => {
  cy.get('[data-testid="bet-success-message"]').should('be.visible');
  cy.get('[data-testid="bet-transaction-hash"]').should('be.visible');
  cy.visit('/profile/bets');
  cy.get('[data-testid="bet-history"]').should('contain', '1 SOL');
});

// Marketplace commands
Cypress.Commands.add('filterAgents', () => {
  cy.get('[data-testid="agent-filter"]').click();
  cy.get('[data-testid="filter-type-gungi"]').click();
  cy.get('[data-testid="filter-price-range"]').click();
  cy.get('[data-testid="price-range-0-10"]').click();
  cy.get('[data-testid="apply-filters"]').click();
});

Cypress.Commands.add('selectAgent', () => {
  cy.get('[data-testid="agent-card"]').first().click();
  cy.get('[data-testid="agent-details"]').should('be.visible');
});

Cypress.Commands.add('purchaseAgent', () => {
  cy.get('[data-testid="purchase-agent-btn"]').click();
  cy.get('[data-testid="purchase-modal"]').should('be.visible');
  cy.get('[data-testid="confirm-purchase"]').click();
  cy.get('[data-testid="transaction-approval"]').should('be.visible');
  cy.get('[data-testid="approve-transaction"]').click();
});

Cypress.Commands.add('verifyOwnership', () => {
  cy.get('[data-testid="purchase-success"]').should('be.visible');
  cy.visit('/profile/agents');
  cy.get('[data-testid="owned-agents"]').should('be.visible');
  cy.get('[data-testid="agent-item"]').should('have.length.greaterThan', 0);
});

// Performance monitoring commands
Cypress.Commands.add('measurePageLoad', (url) => {
  const startTime = Date.now();
  cy.visit(url);
  cy.get('[data-testid="main-content"]').should('be.visible').then(() => {
    const loadTime = Date.now() - startTime;
    cy.wrap(loadTime).should('be.lessThan', 3000);
  });
});

// Viewport commands for responsive testing
Cypress.Commands.add('testViewport', (width, height) => {
  cy.viewport(width, height);
  cy.get('[data-testid="navigation"]').should('be.visible');
  cy.get('[data-testid="main-content"]').should('be.visible');
});

// Error handling commands
Cypress.Commands.add('handleTransactionError', () => {
  cy.get('[data-testid="error-modal"]').should('be.visible');
  cy.get('[data-testid="error-message"]').should('contain', 'Transaction failed');
  cy.get('[data-testid="retry-transaction"]').click();
});

// 3D visualization commands
Cypress.Commands.add('verify3DRendering', () => {
  cy.get('[data-testid="3d-canvas"]').should('be.visible');
  cy.get('[data-testid="3d-canvas"]').should(($canvas) => {
    expect($canvas.width()).to.be.greaterThan(0);
    expect($canvas.height()).to.be.greaterThan(0);
  });
});

Cypress.Commands.add('interact3DBoard', () => {
  cy.get('[data-testid="3d-canvas"]')
    .trigger('mousedown', { clientX: 100, clientY: 100 })
    .trigger('mousemove', { clientX: 200, clientY: 100 })
    .trigger('mouseup');
});

// Network simulation commands
Cypress.Commands.add('simulateSlowNetwork', () => {
  cy.intercept('GET', '**/*', (req) => {
    req.reply((res) => {
      res.delay(2000); // 2 second delay
    });
  });
});

Cypress.Commands.add('simulateNetworkError', () => {
  cy.intercept('POST', '**/rpc', { statusCode: 500 }).as('networkError');
});

// Accessibility testing commands
Cypress.Commands.add('checkA11y', () => {
  cy.get('body').should('be.visible');
  // Add axe-core accessibility checks here if needed
  cy.get('[aria-label]').should('exist');
  cy.get('button').should('have.attr', 'type');
});

// Form validation commands
Cypress.Commands.add('testFormValidation', (formSelector, fields) => {
  fields.forEach(field => {
    cy.get(`${formSelector} [data-testid="${field.id}"]`).type(field.invalidValue);
    cy.get(`${formSelector} [data-testid="submit"]`).click();
    cy.get(`[data-testid="${field.id}-error"]`).should('contain', field.expectedError);
    cy.get(`${formSelector} [data-testid="${field.id}"]`).clear().type(field.validValue);
  });
});

// Declare command types for TypeScript support
declare global {
  namespace Cypress {
    interface Chainable {
      connectWallet(): Chainable<void>;
      connectWalletPhantom(): Chainable<void>;
      connectWalletSolflare(): Chainable<void>;
      disconnectWallet(): Chainable<void>;
      selectMatch(): Chainable<void>;
      placeBet(): Chainable<void>;
      verifyBetPlacement(): Chainable<void>;
      filterAgents(): Chainable<void>;
      selectAgent(): Chainable<void>;
      purchaseAgent(): Chainable<void>;
      verifyOwnership(): Chainable<void>;
      measurePageLoad(url: string): Chainable<void>;
      testViewport(width: number, height: number): Chainable<void>;
      handleTransactionError(): Chainable<void>;
      verify3DRendering(): Chainable<void>;
      interact3DBoard(): Chainable<void>;
      simulateSlowNetwork(): Chainable<void>;
      simulateNetworkError(): Chainable<void>;
      checkA11y(): Chainable<void>;
      testFormValidation(formSelector: string, fields: Array<{id: string, invalidValue: string, validValue: string, expectedError: string}>): Chainable<void>;
    }
  }
}
