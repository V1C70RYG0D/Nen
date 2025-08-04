describe('Critical User Flows', () => {
  it('completes full betting flow', () => {
    cy.visit('/');
    cy.connectWallet();
    cy.selectMatch();
    cy.placeBet();
    cy.verifyBetPlacement();
  });

  it('browses and purchases AI agent', () => {
    cy.visit('/marketplace');
    cy.filterAgents();
    cy.selectAgent();
    cy.purchaseAgent();
    cy.verifyOwnership();
  });
});

