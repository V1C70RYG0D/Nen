describe('Chrome 90+ - All Features Test Suite', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('Authentication & Wallet Integration', () => {
    it('should connect wallet successfully', () => {
      cy.connectWallet();
      cy.get('[data-testid="wallet-status"]').should('contain', 'Connected');
      cy.get('[data-testid="wallet-address"]').should('be.visible');
    });

    it('should handle wallet disconnection gracefully', () => {
      cy.connectWallet();
      cy.disconnectWallet();
      cy.get('[data-testid="wallet-status"]').should('contain', 'Not Connected');
    });
  });

  describe('Game Management Features', () => {
    it('should create a new game', () => {
      cy.connectWallet();
      cy.get('[data-testid="create-game-btn"]').click();
      cy.get('[data-testid="game-type-selector"]').select('Gungi');
      cy.get('[data-testid="game-settings"]').should('be.visible');
      cy.get('[data-testid="confirm-create-game"]').click();
      cy.get('[data-testid="game-created-message"]').should('be.visible');
    });

    it('should join an existing game', () => {
      cy.connectWallet();
      cy.get('[data-testid="browse-games"]').click();
      cy.get('[data-testid="game-list"]').should('be.visible');
      cy.get('[data-testid="join-game-btn"]').first().click();
      cy.get('[data-testid="game-board"]').should('be.visible');
    });
  });

  describe('Betting System', () => {
    it('should place a bet on a match', () => {
      cy.connectWallet();
      cy.visit('/matches');
      cy.get('[data-testid="match-card"]').first().click();
      cy.placeBet();
      cy.verifyBetPlacement();
    });

    it('should display bet history', () => {
      cy.connectWallet();
      cy.visit('/profile/bets');
      cy.get('[data-testid="bet-history"]').should('be.visible');
      cy.get('[data-testid="bet-item"]').should('have.length.greaterThan', 0);
    });
  });

  describe('AI Agent Marketplace', () => {
    it('should browse and filter AI agents', () => {
      cy.visit('/marketplace');
      cy.filterAgents();
      cy.get('[data-testid="agent-grid"]').should('be.visible');
      cy.get('[data-testid="agent-card"]').should('have.length.greaterThan', 0);
    });

    it('should purchase an AI agent', () => {
      cy.connectWallet();
      cy.visit('/marketplace');
      cy.selectAgent();
      cy.purchaseAgent();
      cy.verifyOwnership();
    });
  });

  describe('GameBoard Rendering & 3D Visualization', () => {
    it('should render 3D game board correctly', () => {
      cy.visit('/game/demo');
      cy.get('[data-testid="3d-canvas"]').should('be.visible');
      cy.get('[data-testid="game-pieces"]').should('be.visible');
    });

    it('should support board rotation and zoom', () => {
      cy.visit('/game/demo');
      cy.get('[data-testid="3d-canvas"]').trigger('wheel', { deltaY: -100 });
      cy.get('[data-testid="zoom-level"]').should('not.contain', '100%');
    });
  });

  describe('Performance Features', () => {
    it('should load pages within acceptable time limits', () => {
      const startTime = Date.now();
      cy.visit('/');
      cy.get('[data-testid="main-content"]').should('be.visible').then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(3000); // 3 seconds
      });
    });

    it('should handle concurrent user interactions', () => {
      cy.connectWallet();
      cy.visit('/game/multiplayer');
      cy.get('[data-testid="player-actions"]').should('be.visible');
      cy.get('[data-testid="move-piece"]').click({ multiple: true });
    });
  });

  describe('Responsive Design', () => {
    it('should display correctly on different viewport sizes', () => {
      cy.viewport(1920, 1080);
      cy.visit('/');
      cy.get('[data-testid="navigation"]').should('be.visible');

      cy.viewport(1366, 768);
      cy.get('[data-testid="navigation"]').should('be.visible');

      cy.viewport(1280, 720);
      cy.get('[data-testid="navigation"]').should('be.visible');
    });
  });
});
