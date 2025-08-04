describe('User Workflows', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.injectAxe();
  });

  it('should complete the full betting workflow', () => {
    // 1. Connect wallet
    cy.contains('Connect Wallet').click();
    cy.contains('Phantom').click();
    cy.contains('Wallet connected').should('be.visible');

    // 2. Navigate to a match
    cy.get('.match-card').first().click();
    cy.url().should('include', '/arena/');

    // 3. Place a bet
    cy.get('[data-testid="bet-agent-1"]').click();
    cy.get('[data-testid="bet-amount-input"]').type('0.1');
    cy.get('[data-testid="place-bet-button"]').click();
    cy.contains('Bet placed successfully').should('be.visible');

    // 4. Check accessibility throughout
    cy.checkA11y();
  });

  it('should allow user to browse marketplace', () => {
    cy.get('[data-testid="nav-marketplace"]').click();
    cy.url().should('include', '/marketplace');
    cy.contains('AI Marketplace').should('be.visible');

    // Check filters work
    cy.get('[data-testid="filter-price"]').click();
    cy.get('[data-testid="price-low-high"]').click();

    // Check accessibility
    cy.checkA11y();
  });

  it('should display user profile correctly', () => {
    // Connect wallet first
    cy.contains('Connect Wallet').click();
    cy.contains('Phantom').click();

    cy.get('[data-testid="nav-profile"]').click();
    cy.url().should('include', '/profile');
    cy.contains('My Profile').should('be.visible');
    cy.contains('Betting History').should('be.visible');

    cy.checkA11y();
  });

  it('should handle match filtering and sorting', () => {
    // Test live matches filter
    cy.get('[data-testid="filter-live"]').click();
    cy.get('.match-card').should('contain', 'LIVE');

    // Test upcoming matches filter
    cy.get('[data-testid="filter-upcoming"]').click();
    cy.get('.match-card').should('contain', 'UPCOMING');

    // Test sorting
    cy.get('[data-testid="sort-pool-size"]').click();

    cy.checkA11y();
  });

  it('should handle error states gracefully', () => {
    // Simulate network error
    cy.intercept('GET', '/api/matches', { statusCode: 500 });
    cy.reload();

    cy.contains('Failed to load matches').should('be.visible');
    cy.get('[data-testid="retry-button"]').should('be.visible').click();

    cy.checkA11y();
  });
});
