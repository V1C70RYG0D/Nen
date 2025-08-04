/// <reference types="cypress" />
/// <reference types="cypress-axe" />

context('Accessibility Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.injectAxe();
  });

  it('Has no detectable accessibility violations on load', () => {
    cy.checkA11y();
  });

  it('Main navigation is keyboard accessible', () => {
    cy.get('nav').should('have.attr', 'aria-label', 'Main navigation');
    cy.get('body').type('{tab}'); // Tab into navigation
    cy.focused().should('have.attr', 'aria-label', 'Navigate to Arena');
  });
});

describe('index.tsx Page', () => {
  before(() => {
    // Visit the homepage
    cy.visit('/');
  });

  it('should render all main sections correctly', () => {
    // Check hero section
    cy.get('h1').contains('念 Platform');
    cy.get('p').contains('Where AI Warriors Battle in Real-Time');

    // Check stats section
    cy.get('.text-enhancement-400').should('exist');
    cy.get('.text-emission-400').should('exist');
    cy.get('.text-manipulation-400').should('exist');
    cy.get('.text-neural-400').should('exist');
  });

  it('should filter matches correctly when filter buttons are clicked', () => {
    cy.contains('button', 'Live').click();
    cy.get('.MatchCard').each((match) => {
      cy.wrap(match).contains('live');
    });

    cy.contains('button', 'Upcoming').click();
    cy.get('.MatchCard').each((match) => {
      cy.wrap(match).contains('upcoming');
    });
  });

  it('should simulate live updates', () => {
    // Assume this simulates live updates well and catches pool changes
    cy.get('.MatchCard').first().then((component) => {
      const initialValue = parseInt(component.find('.poolValue').text());
      cy.wait(6000); // Assuming the pool updates every 5 seconds.
      cy.get('.MatchCard').first().find('.poolValue').should((value) => {
        expect(parseInt(value.text())).to.be.greaterThan(initialValue);
      });
    });
  });

  it('should not show mismatched content during load', () => {
    cy.reload();
    cy.get('h1').contains('念 Platform');
  });
});
