// Mock for MagicBlock Engine SDK
module.exports = {
  MagicBlockEngine: class MockMagicBlockEngine {
    constructor(config = {}) {
      this.config = config;
      this.connected = false;
      this.gameState = null;
      this.eventHandlers = new Map();
    }

    connect = jest.fn().mockImplementation(async () => {
      this.connected = true;
      this.emit('connected', { status: 'connected' });
      return { success: true };
    });

    disconnect = jest.fn().mockImplementation(async () => {
      this.connected = false;
      this.emit('disconnected', { status: 'disconnected' });
      return { success: true };
    });

    submitMove = jest.fn().mockImplementation(async (move) => {
      const moveId = `move_${Date.now()}`;
      setTimeout(() => {
        this.emit('moveValidated', {
          moveId,
          move,
          success: true,
          timestamp: Date.now(),
        });
      }, 10);
      return { moveId, success: true };
    });

    getGameState = jest.fn().mockImplementation(() => {
      return {
        gameId: 'mock-game-123',
        players: [
          { id: 'player1', name: 'Agent One', score: 100 },
          { id: 'player2', name: 'Agent Two', score: 85 },
        ],
        status: 'active',
        currentTurn: 'player1',
        board: Array(8).fill(null).map(() => Array(8).fill(null)),
        lastMove: null,
        timestamp: Date.now(),
      };
    });

    subscribeToGameUpdates = jest.fn().mockImplementation((callback) => {
      this.eventHandlers.set('gameUpdate', callback);
      return () => {
        this.eventHandlers.delete('gameUpdate');
      };
    });

    on = jest.fn().mockImplementation((event, handler) => {
      this.eventHandlers.set(event, handler);
    });

    off = jest.fn().mockImplementation((event) => {
      this.eventHandlers.delete(event);
    });

    emit = jest.fn().mockImplementation((event, data) => {
      const handler = this.eventHandlers.get(event);
      if (handler) {
        handler(data);
      }
    });

    // Mock game-specific methods
    createGame = jest.fn().mockResolvedValue({
      gameId: 'mock-game-123',
      success: true,
    });

    joinGame = jest.fn().mockResolvedValue({
      gameId: 'mock-game-123',
      playerId: 'mock-player-456',
      success: true,
    });

    leaveGame = jest.fn().mockResolvedValue({
      success: true,
    });

    getAvailableGames = jest.fn().mockResolvedValue([
      {
        gameId: 'game-1',
        name: 'Nen Match 1',
        players: 2,
        maxPlayers: 2,
        status: 'waiting',
      },
      {
        gameId: 'game-2',
        name: 'Nen Match 2',
        players: 1,
        maxPlayers: 2,
        status: 'waiting',
      },
    ]);

    // Mock blockchain integration
    submitToBlockchain = jest.fn().mockResolvedValue({
      transactionId: 'mock-tx-789',
      success: true,
      blockHeight: 12345,
    });

    verifyMove = jest.fn().mockResolvedValue({
      valid: true,
      signature: 'mock-signature-abc',
    });
  },

  // Mock constants
  MagicBlockEventTypes: {
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    GAME_UPDATE: 'gameUpdate',
    MOVE_VALIDATED: 'moveValidated',
    ERROR: 'error',
  },

  // Mock configuration types
  MagicBlockConfig: {
    DEVNET: 'devnet',
    TESTNET: 'testnet',
    MAINNET: 'mainnet-beta',
  },
};
