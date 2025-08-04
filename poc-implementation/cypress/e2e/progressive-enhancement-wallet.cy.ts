describe('Progressive Enhancement - Wallet Integration', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('Browser Compatibility Detection', () => {
    it('should detect browser capabilities correctly', () => {
      cy.window().then((win) => {
        // Test browser capability detection
        cy.get('[data-testid="browser-capabilities"]').should('exist');
        cy.get('[data-testid="browser-type"]').should('not.be.empty');
        cy.get('[data-testid="browser-version"]').should('not.be.empty');
      });
    });

    it('should show detailed capability information when toggled', () => {
      cy.get('[data-testid="toggle-details-btn"]').click();
      cy.get('[data-testid="capability-web-extensions"]').should('be.visible');
      cy.get('[data-testid="capability-local-storage"]').should('be.visible');
      cy.get('[data-testid="capability-web-crypto"]').should('be.visible');
      cy.get('[data-testid="capability-wallet-standard"]').should('be.visible');
    });
  });

  describe('Wallet Support Detection', () => {
    it('should detect installed wallets correctly', () => {
      cy.window().then((win) => {
        // Simulate Phantom wallet presence
        win.solana = {
          isPhantom: true,
          connect: cy.stub().resolves(),
          disconnect: cy.stub().resolves(),
          on: cy.stub(),
          off: cy.stub()
        };
      });

      cy.reload();
      cy.get('[data-testid="supported-wallets"]').should('contain', 'Phantom');
    });

    it('should show no wallets message when none are installed', () => {
      cy.window().then((win) => {
        delete win.solana;
        delete win.phantom;
        delete win.solflare;
      });

      cy.reload();
      cy.get('[data-testid="no-wallets-message"]').should('be.visible');
      cy.get('[data-testid="no-wallets-message"]').should('contain', 'No compatible wallets detected');
    });
  });

  describe('Fallback UI Display', () => {
    beforeEach(() => {
      // Simulate unsupported browser
      cy.window().then((win) => {
        delete win.solana;
        delete win.chrome;
        // Simulate older browser
        Object.defineProperty(win.navigator, 'userAgent', {
          writable: true,
          value: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1)'
        });
      });
      cy.reload();
    });

    it('should display wallet fallback component for unsupported browsers', () => {
      cy.get('[data-testid="wallet-fallback"]').should('be.visible');
      cy.get('[data-testid="fallback-title"]').should('contain', 'Wallet Integration Unavailable');
      cy.get('[data-testid="fallback-message"]').should('be.visible');
    });

    it('should show browser upgrade recommendations', () => {
      cy.get('[data-testid="recommended-actions"]').should('be.visible');
      cy.get('[data-testid="action-chrome-download"]').should('contain', 'Install Chrome');
      cy.get('[data-testid="action-firefox-download"]').should('contain', 'Install Firefox');
    });

    it('should display minimum browser requirements', () => {
      cy.get('[data-testid="minimum-requirements"]').should('be.visible');
      cy.get('[data-testid="requirement-chrome"]').should('contain', '88+');
      cy.get('[data-testid="requirement-firefox"]').should('contain', '88+');
      cy.get('[data-testid="requirement-safari"]').should('contain', '14+');
      cy.get('[data-testid="requirement-edge"]').should('contain', '88+');
    });
  });

  describe('Graceful Degradation', () => {
    it('should allow users to continue without wallet', () => {
      // Simulate no wallet support
      cy.window().then((win) => {
        delete win.solana;
      });

      cy.reload();
      cy.get('[data-testid="continue-without-wallet-btn"]').should('be.visible');
      cy.get('[data-testid="continue-without-wallet-btn"]').click();

      // Should navigate to read-only mode
      cy.get('[data-testid="read-only-mode"]').should('be.visible');
      cy.get('[data-testid="wallet-required-features"]').should('not.exist');
    });

    it('should hide wallet-dependent features in read-only mode', () => {
      cy.get('[data-testid="continue-without-wallet-btn"]').click();

      // Wallet-dependent features should be hidden
      cy.get('[data-testid="place-bet-btn"]').should('not.exist');
      cy.get('[data-testid="nft-purchase-btn"]').should('not.exist');
      cy.get('[data-testid="transaction-history-btn"]').should('not.exist');

      // Read-only features should be visible
      cy.get('[data-testid="game-viewer"]').should('be.visible');
      cy.get('[data-testid="leaderboard"]').should('be.visible');
      cy.get('[data-testid="match-history"]').should('be.visible');
    });

    it('should show informational messages for disabled features', () => {
      cy.get('[data-testid="continue-without-wallet-btn"]').click();

      cy.get('[data-testid="betting-section"]').within(() => {
        cy.get('[data-testid="feature-disabled-message"]').should('be.visible');
        cy.get('[data-testid="feature-disabled-message"]').should('contain', 'Connect a wallet to place bets');
      });

      cy.get('[data-testid="nft-section"]').within(() => {
        cy.get('[data-testid="feature-disabled-message"]').should('be.visible');
        cy.get('[data-testid="feature-disabled-message"]').should('contain', 'Connect a wallet to purchase NFTs');
      });
    });
  });

  describe('Error Recovery', () => {
    it('should provide retry connection option', () => {
      cy.get('[data-testid="retry-connection-btn"]').should('be.visible');
      cy.get('[data-testid="retry-connection-btn"]').click();

      // Should attempt to reload and recheck wallet availability
      cy.url().should('eq', Cypress.config().baseUrl + '/');
    });

    it('should handle wallet connection failures gracefully', () => {
      cy.window().then((win) => {
        win.solana = {
          isPhantom: true,
          connect: cy.stub().rejects(new Error('User rejected connection')),
          disconnect: cy.stub().resolves(),
          on: cy.stub(),
          off: cy.stub()
        };
      });

      cy.get('[data-testid="connect-wallet-btn"]').click();
      cy.get('[data-testid="wallet-connection-error"]').should('be.visible');
      cy.get('[data-testid="wallet-connection-error"]').should('contain', 'Failed to connect wallet');

      // Should show retry option
      cy.get('[data-testid="retry-wallet-connection"]').should('be.visible');
    });

    it('should handle network switching failures', () => {
      // Mock wallet with network switching capability
      cy.window().then((win) => {
        win.solana = {
          isPhantom: true,
          connect: cy.stub().resolves(),
          disconnect: cy.stub().resolves(),
          on: cy.stub(),
          off: cy.stub(),
          request: cy.stub().callsFake((params) => {
            if (params.method === 'wallet_switchEthereumChain') {
              return Promise.reject(new Error('Network switch failed'));
            }
            return Promise.resolve();
          })
        };
      });

      cy.connectWallet();
      cy.get('[data-testid="network-selector"]').click();
      cy.get('[data-testid="network-mainnet"]').click();

      cy.get('[data-testid="network-switch-error"]').should('be.visible');
      cy.get('[data-testid="network-switch-error"]').should('contain', 'Failed to switch network');
    });
  });

  describe('Mobile Browser Support', () => {
    beforeEach(() => {
      // Simulate mobile browser
      cy.viewport('iphone-x');
      cy.window().then((win) => {
        Object.defineProperty(win.navigator, 'userAgent', {
          writable: true,
          value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
        });
      });
    });

    it('should detect mobile browsers correctly', () => {
      cy.reload();
      cy.get('[data-testid="mobile-browser-detected"]').should('be.visible');
      cy.get('[data-testid="mobile-recommendations"]').should('be.visible');
    });

    it('should show mobile-specific wallet recommendations', () => {
      cy.get('[data-testid="mobile-wallet-recommendations"]').should('contain', 'mobile wallet apps');
      cy.get('[data-testid="phantom-mobile-link"]').should('have.attr', 'href').and('include', 'phantom.app');
      cy.get('[data-testid="solflare-mobile-link"]').should('have.attr', 'href').and('include', 'solflare.com');
    });
  });

  describe('Accessibility Features', () => {
    it('should be keyboard navigable', () => {
      cy.get('[data-testid="wallet-fallback"]').focus();
      cy.focused().should('have.attr', 'data-testid', 'wallet-fallback');

      // Tab through interactive elements
      cy.tab();
      cy.focused().should('have.attr', 'data-testid', 'toggle-details-btn');

      cy.tab();
      cy.focused().should('have.attr', 'data-testid', 'retry-connection-btn');

      cy.tab();
      cy.focused().should('have.attr', 'data-testid', 'continue-without-wallet-btn');
    });

    it('should have proper ARIA labels', () => {
      cy.get('[data-testid="wallet-fallback"]').should('have.attr', 'role', 'alert');
      cy.get('[data-testid="fallback-title"]').should('have.attr', 'aria-level', '2');
      cy.get('[data-testid="browser-capabilities"]').should('have.attr', 'aria-labelledby');
      cy.get('[data-testid="recommended-actions"]').should('have.attr', 'role', 'list');
    });

    it('should provide screen reader friendly content', () => {
      cy.get('[data-testid="screen-reader-status"]').should('exist');
      cy.get('[data-testid="screen-reader-status"]').should('contain.text', 'Wallet integration is not available');

      // Should announce capability status
      cy.get('[data-testid="capability-announcements"]').should('exist');
    });
  });

  describe('Performance Considerations', () => {
    it('should load fallback UI quickly', () => {
      const startTime = Date.now();

      cy.window().then((win) => {
        delete win.solana;
      });

      cy.reload();
      cy.get('[data-testid="wallet-fallback"]').should('be.visible').then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(2000); // Should load within 2 seconds
      });
    });

    it('should not block main thread during compatibility checks', () => {
      cy.window().then((win) => {
        // Add performance observer to check for long tasks
        win.performance.mark('compatibility-check-start');
      });

      cy.reload();

      cy.window().then((win) => {
        win.performance.mark('compatibility-check-end');
        win.performance.measure('compatibility-check', 'compatibility-check-start', 'compatibility-check-end');

        const measure = win.performance.getEntriesByName('compatibility-check')[0];
        expect(measure.duration).to.be.lessThan(100); // Should complete within 100ms
      });
    });
  });

  describe('Browser Specific Tests', () => {
    describe('Firefox Support', () => {
      beforeEach(() => {
        cy.window().then((win) => {
          Object.defineProperty(win.navigator, 'userAgent', {
            writable: true,
            value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0'
          });
        });
      });

      it('should handle Firefox-specific wallet integration', () => {
        cy.reload();
        cy.get('[data-testid="browser-type"]').should('contain', 'Firefox');
        cy.get('[data-testid="firefox-specific-instructions"]').should('be.visible');
      });
    });

    describe('Safari Support', () => {
      beforeEach(() => {
        cy.window().then((win) => {
          Object.defineProperty(win.navigator, 'userAgent', {
            writable: true,
            value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15'
          });
        });
      });

      it('should show Safari-specific limitations', () => {
        cy.reload();
        cy.get('[data-testid="browser-type"]').should('contain', 'Safari');
        cy.get('[data-testid="safari-limitations"]').should('be.visible');
        cy.get('[data-testid="safari-limitations"]').should('contain', 'Limited wallet support');
      });
    });
  });

  describe('Integration with Existing Features', () => {
    it('should integrate seamlessly with game interface', () => {
      cy.get('[data-testid="continue-without-wallet-btn"]').click();

      // Game should load in read-only mode
      cy.get('[data-testid="game-board"]').should('be.visible');
      cy.get('[data-testid="spectator-mode-indicator"]').should('be.visible');

      // Wallet prompt should appear when trying to interact
      cy.get('[data-testid="game-piece"]').first().click();
      cy.get('[data-testid="wallet-required-modal"]').should('be.visible');
    });

    it('should maintain feature parity where possible', () => {
      cy.get('[data-testid="continue-without-wallet-btn"]').click();

      // Non-wallet features should work normally
      cy.get('[data-testid="settings-btn"]').click();
      cy.get('[data-testid="settings-modal"]').should('be.visible');

      cy.get('[data-testid="help-btn"]').click();
      cy.get('[data-testid="help-modal"]').should('be.visible');

      cy.get('[data-testid="about-btn"]').click();
      cy.get('[data-testid="about-modal"]').should('be.visible');
    });
  });
});
