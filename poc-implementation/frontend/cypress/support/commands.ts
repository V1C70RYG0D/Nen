/// <reference types="cypress" />

// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command for wallet connection
Cypress.Commands.add('connectWallet', () => {
  cy.contains('Connect Wallet').click();
  cy.get('.wallet-adapter-modal').should('be.visible');
  cy.contains('Phantom').click();
  cy.get('.wallet-adapter-modal').should('not.exist');
});

// Custom command for disconnecting wallet
Cypress.Commands.add('disconnectWallet', () => {
  cy.get('[data-testid="wallet-button"]').click();
  cy.contains('Disconnect').click();
});

// Note: checkA11y and injectAxe commands are provided by cypress-axe
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }