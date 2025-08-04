describe('Responsive Design', () => {
  const viewports = [
    { device: 'mobile', width: 375, height: 667 },
    { device: 'tablet', width: 768, height: 1024 },
    { device: 'desktop', width: 1280, height: 720 },
    { device: 'wide', width: 1920, height: 1080 }
  ];

  viewports.forEach(({ device, width, height }) => {
    context(`${device} (${width}x${height})`, () => {
      beforeEach(() => {
        cy.viewport(width, height);
        cy.visit('/');
        cy.injectAxe();
      });

      it('should render navigation correctly', () => {
        if (device === 'mobile') {
          // Mobile menu should be visible
          cy.get('[data-testid="mobile-menu-button"]').should('be.visible');
          cy.get('.md\\:flex').should('not.be.visible');
        } else {
          // Desktop navigation should be visible
          cy.get('[data-testid="nav-links"]').should('be.visible');
        }
        cy.checkA11y();
      });

      it('should handle layout correctly', () => {
        cy.get('main').should('be.visible');
        cy.get('nav').should('be.visible');
        cy.get('footer').should('be.visible');

        // Check that content doesn't overflow
        cy.get('body').should('not.have.css', 'overflow-x', 'visible');
        cy.checkA11y();
      });

      it('should render match cards appropriately', () => {
        // Mock some match data first
        cy.intercept('GET', '/api/matches', { fixture: 'matches.json' });
        cy.reload();

        if (device === 'mobile') {
          // On mobile, cards should stack vertically
          cy.get('.match-card').should('have.length.at.least', 1);
          cy.get('.match-card').first().should('have.css', 'width').and('not.equal', '0px');
        } else {
          // On larger screens, cards can be in a grid
          cy.get('.match-card').should('have.length.at.least', 1);
        }
        cy.checkA11y();
      });
    });
  });
});
