describe('Authentication Flows', () => {
    beforeEach(() => {
        cy.visit('/')
        cy.injectAxe();
    });

    it('should allow a user to connect their wallet', () => {
        cy.contains('Connect Wallet').click();
        cy.get('.wallets-modal').should('be.visible');
        // Simulate specific wallet selection and connection
        cy.contains('Phantom').click();
        cy.contains('Wallet connected').should('be.visible');
        cy.checkA11y(); // Check accessibility compliance
    });

    it('should manage session state correctly', () => {
        cy.contains('Connect Wallet').click();
        cy.contains('Phantom').click();
        cy.contains('Wallet connected').should('be.visible');
        cy.reload();
        cy.contains('Wallet connected').should('be.visible'); // Should retain session
        cy.checkA11y(); // Check accessibility compliance
    });
});
