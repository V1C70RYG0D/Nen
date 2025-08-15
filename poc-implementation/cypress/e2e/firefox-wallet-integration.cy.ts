describe('Firefox 88+ - Wallet Integration Focus', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('Wallet Connection & Authentication', () => {
    it('should detect and connect to Phantom wallet', () => {
      cy.window().should('have.property', 'solana');
      cy.connectWalletPhantom();
      cy.get('[data-testid="wallet-provider"]').should('contain', 'Phantom');
      cy.get('[data-testid="wallet-status"]').should('contain', 'Connected');
    });

    it('should display fallback for unsupported browsers', () => {
      cy.window().then((win) => {
        delete win.solana;
      });
      cy.visit('/');
      cy.get('[data-testid="fallback-title"]').should('contain', 'Wallet Integration Unavailable');
      cy.get('[data-testid="fallback-message"]').should('contain', "Your browser doesn't support wallet extensions.");
    });

    it('should detect and connect to Solflare wallet', () => {
      cy.connectWalletSolflare();
      cy.get('[data-testid="wallet-provider"]').should('contain', 'Solflare');
      cy.get('[data-testid="wallet-status"]').should('contain', 'Connected');
    });

    it('should handle wallet switching', () => {
      cy.connectWalletPhantom();
      cy.get('[data-testid="wallet-switcher"]').click();
      cy.get('[data-testid="wallet-option-solflare"]').click();
      cy.get('[data-testid="wallet-provider"]').should('contain', 'Solflare');
    });
  });

  describe('Transaction Processing', () => {
    it('should process SOL transactions correctly', () => {
      cy.connectWallet();
      cy.visit('/wallet/send');
      cy.get('[data-testid="recipient-address"]').type('11111111111111111111111111111112');
      cy.get('[data-testid="amount"]').type('0.1');
      cy.get('[data-testid="send-transaction"]').click();
      cy.get('[data-testid="transaction-confirmation"]').should('be.visible');
    });

    it('should handle token transfers', () => {
      cy.connectWallet();
      cy.visit('/wallet/tokens');
      cy.get('[data-testid="token-list"]').should('be.visible');
      cy.get('[data-testid="transfer-token-btn"]').first().click();
      cy.get('[data-testid="token-transfer-modal"]').should('be.visible');
    });

    it('should display transaction history', () => {
      cy.connectWallet();
      cy.visit('/wallet/history');
      cy.get('[data-testid="transaction-history"]').should('be.visible');
      cy.get('[data-testid="transaction-item"]').should('have.length.greaterThan', 0);
    });
  });

  describe('Smart Contract Interactions', () => {
    it('should interact with betting contracts', () => {
      cy.connectWallet();
      cy.visit('/matches');
      cy.get('[data-testid="match-card"]').first().click();
      cy.get('[data-testid="bet-amount"]').type('1');
      cy.get('[data-testid="place-bet-btn"]').click();
      cy.get('[data-testid="contract-interaction-modal"]').should('be.visible');
      cy.get('[data-testid="confirm-transaction"]').click();
    });

    it('should handle NFT marketplace transactions', () => {
      cy.connectWallet();
      cy.visit('/marketplace');
      cy.get('[data-testid="agent-card"]').first().click();
      cy.get('[data-testid="purchase-agent-btn"]').click();
      cy.get('[data-testid="nft-purchase-modal"]').should('be.visible');
      cy.get('[data-testid="confirm-purchase"]').click();
    });
  });

  describe('Wallet Security Features', () => {
    it('should prompt for transaction approval', () => {
      cy.connectWallet();
      cy.visit('/wallet/send');
      cy.get('[data-testid="recipient-address"]').type('11111111111111111111111111111112');
      cy.get('[data-testid="amount"]').type('0.1');
      cy.get('[data-testid="send-transaction"]').click();
      cy.get('[data-testid="approval-prompt"]').should('be.visible');
    });

    it('should handle transaction rejection', () => {
      cy.connectWallet();
      cy.visit('/wallet/send');
      cy.get('[data-testid="recipient-address"]').type('11111111111111111111111111111112');
      cy.get('[data-testid="amount"]').type('0.1');
      cy.get('[data-testid="send-transaction"]').click();
      cy.get('[data-testid="reject-transaction"]').click();
      cy.get('[data-testid="transaction-rejected"]').should('be.visible');
    });

    it('should validate transaction parameters', () => {
      cy.connectWallet();
      cy.visit('/wallet/send');
      cy.get('[data-testid="recipient-address"]').type('invalid-address');
      cy.get('[data-testid="amount"]').type('0.1');
      cy.get('[data-testid="send-transaction"]').click();
      cy.get('[data-testid="validation-error"]').should('contain', 'Invalid address');
    });
  });

  describe('Wallet State Management', () => {
    it('should persist wallet connection across page reloads', () => {
      cy.connectWallet();
      cy.get('[data-testid="wallet-status"]').should('contain', 'Connected');
      cy.reload();
      cy.get('[data-testid="wallet-status"]').should('contain', 'Connected');
    });

    it('should handle network switching', () => {
      cy.connectWallet();
      cy.get('[data-testid="network-selector"]').click();
      cy.get('[data-testid="network-devnet"]').click();
      cy.get('[data-testid="current-network"]').should('contain', 'Devnet');
    });

    it('should display correct balance information', () => {
      cy.connectWallet();
      cy.get('[data-testid="wallet-balance"]').should('be.visible');
      cy.get('[data-testid="sol-balance"]').should('match', /^\d+(\.\d+)? SOL$/);
    });
  });

  describe('Error Handling & Recovery', () => {
    it('should handle wallet connection failures gracefully', () => {
      cy.visit('/');
      cy.get('[data-testid="connect-wallet-btn"]').click();
      // Simulate wallet not available
      cy.window().then(win => {
        delete win.solana;
      });
      cy.get('[data-testid="wallet-error"]').should('contain', 'Wallet not detected');
    });

    it('should recover from network connection issues', () => {
      cy.connectWallet();
      // Simulate network error
      cy.intercept('POST', '**/rpc', { statusCode: 500 }).as('networkError');
      cy.get('[data-testid="refresh-connection"]').click();
      cy.wait('@networkError');
      cy.get('[data-testid="connection-error"]').should('be.visible');
    });
  });
});
