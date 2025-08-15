/**
 * Focused Test Suite for Gungi Game Engine
 * Testing core functionality with manageable scope
 */

import {
  GungiGameEngine,
  PieceType,
  Player,
  GameState,
  Position,
  Move,
  GameStatus
} from '../../services/GungiGameEngine';

describe('Gungi Game Engine - Core Tests', () => {
  let gameEngine: GungiGameEngine;

  beforeEach(() => {
    gameEngine = new GungiGameEngine('test-game');
  });

  describe('1. Initial Board Setup', () => {
    test('should initialize game correctly', () => {
      const gameState = gameEngine.getGameState();

      expect(gameState.board).toBeDefined();
      expect(gameState.board.length).toBe(9);
      expect(gameState.board[0].length).toBe(9);
      expect(gameState.currentPlayer).toBe(Player.PLAYER_1);
      expect(gameState.status).toBe(GameStatus.ACTIVE);
    });

    test('should place pieces correctly', () => {
      const gameState = gameEngine.getGameState();
      let pieceCount = 0;

      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (gameState.board[row][col][0]) {
            pieceCount++;
          }
        }
      }

      expect(pieceCount).toBeGreaterThan(0);
    });
  });

  describe('2. Move Generation', () => {
    test('should generate valid moves', () => {
      const moves = gameEngine.getValidMoves();
      expect(Array.isArray(moves)).toBe(true);
      expect(moves.length).toBeGreaterThan(0);
    });

    test('should only show current player moves', () => {
      const gameState = gameEngine.getGameState();
      const moves = gameEngine.getValidMoves();

      moves.forEach(move => {
        const piece = gameState.board[move.from.row][move.from.col][move.from.tier];
        expect(piece?.player).toBe(gameState.currentPlayer);
      });
    });
  });

  describe('3. Move Validation', () => {
    test('should reject invalid moves', () => {
      const result = gameEngine.makeMove(
        { row: 0, col: 0, tier: 0 },
        { row: 8, col: 8, tier: 0 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should accept valid moves', () => {
      const validMoves = gameEngine.getValidMoves();
      if (validMoves.length > 0) {
        const move = validMoves[0];
        const result = gameEngine.makeMove(move.from, move.to);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('4. Board State Management', () => {
    test('should update board after move', () => {
      const validMoves = gameEngine.getValidMoves();
      if (validMoves.length > 0) {
        const move = validMoves[0];
        const initialState = JSON.stringify(gameEngine.getGameState());

        gameEngine.makeMove(move.from, move.to);
        const newState = JSON.stringify(gameEngine.getGameState());

        expect(newState).not.toBe(initialState);
      }
    });

    test('should switch players after move', () => {
      const initialPlayer = gameEngine.getGameState().currentPlayer;
      const validMoves = gameEngine.getValidMoves();

      if (validMoves.length > 0) {
        const move = validMoves[0];
        gameEngine.makeMove(move.from, move.to);
        const newPlayer = gameEngine.getGameState().currentPlayer;

        expect(newPlayer).not.toBe(initialPlayer);
      }
    });
  });

  describe('5. Game History', () => {
    test('should track move history', () => {
      const initialHistory = gameEngine.getGameState().moves.length;
      const validMoves = gameEngine.getValidMoves();

      if (validMoves.length > 0) {
        const move = validMoves[0];
        gameEngine.makeMove(move.from, move.to);
        const newHistory = gameEngine.getGameState().moves.length;

        expect(newHistory).toBe(initialHistory + 1);
      }
    });
  });

  describe('6. Serialization', () => {
    test('should serialize and deserialize game state', () => {
      const originalState = gameEngine.getGameState();
      const serialized = gameEngine.exportGameState();

      expect(typeof serialized).toBe('string');
      expect(serialized.length).toBeGreaterThan(0);

      const newEngine = new GungiGameEngine('test-deserialization');
      const deserializeResult = newEngine.importGameState(serialized);

      expect(deserializeResult).toBe(true);

      const deserializedState = newEngine.getGameState();
      expect(deserializedState.currentPlayer).toBe(originalState.currentPlayer);
      expect(deserializedState.status).toBe(originalState.status);
    });
  });

  describe('7. Performance and Edge Cases', () => {
    test('should handle rapid move generation', () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        gameEngine.getValidMoves();
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    test('should handle empty position queries gracefully', () => {
      const result = gameEngine.makeMove(
        { row: 4, col: 4, tier: 0 }, // Likely empty center
        { row: 5, col: 5, tier: 0 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No piece');
    });
  });
});
