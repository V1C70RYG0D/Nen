describe('_app.tsx Component', () => {
  before(() => {
    // Visit the homepage (baseUrl is set in cypress.config.ts)
    cy.visit('/');
  });

  it('should use QueryClientProvider correctly', () => {
    // Ensure the queries do not refetch on focus
    cy.window().should((win) => {
      expect((win as any).queryClient?.getDefaultOptions()?.queries?.refetchOnWindowFocus).to.be.false;
    });
  });

  it('should use WalletContextProvider', () => {
    // Simulate opening and closing the connect wallet modal
    cy.window().then((win) => {
      cy.stub(win, 'alert').as('windowAlert');
    });
    cy.get('[data-testid="wallet-button"]').click();
    cy.get('.wallet-adapter-modal').should('be.visible');
    cy.contains('Phantom').click();
    cy.get('.wallet-adapter-modal').should('not.exist');
  });

  it('should render toast notifications with correct styles', () => {
    cy.get('body').then(($body) => {
      if ($body.find('.toast').length > 0) {
        cy.get('.toast').should('have.css', 'background-color', 'rgb(26, 31, 58)');
      }
    });
  });
});
