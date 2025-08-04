import { GungiGameEngine, PieceType, Position, Player, GameStatus } from '../backend/src/services/GungiGameEngine';

describe('Enhanced Gungi Engine', () => {
  let engine: GungiGameEngine;

  beforeEach(() => {
    engine = new GungiGameEngine('test-enhanced');
  });

  it('Should initialize 9x9 board correctly', () => {
    const board = engine.getGameState().board;
    expect(board.length).toBe(9);
    expect(board[0].length).toBe(9);
  });

  it('Should validate piece movements correctly', () => {
    const fromPos: Position = { row: 0, col: 0, tier: 0 };
    const toPos: Position = { row: 0, col: 1, tier: 0 };

    // Assume a piece is manually placed for testing
    engine.getGameState().board[0][0][0] = {
      id: 'piece-test',
      type: PieceType.PAWN,
      player: Player.PLAYER_1,
      position: fromPos,
      isActive: true,
      moveCount: 0
    };

    const moveResult = engine.makeMove(fromPos, toPos);
    expect(moveResult.success).toBe(true);
  });

  it('Should handle piece stacking (up to 3 levels)', () => {
    const position: Position = { row: 4, col: 4, tier: 0 };

    // Manually place a piece
    engine.getGameState().board[4][4][0] = {
      id: 'piece-stack-1',
      type: PieceType.PAWN,
      player: Player.PLAYER_1,
      position,
      isActive: true,
      moveCount: 0
    };

    // Test stacking piece
    const firstStack = engine.makeMove({ row: 4, col: 4, tier: 0 }, { row: 4, col: 4, tier: 1 });
    const secondStack = engine.makeMove({ row: 4, col: 4, tier: 1 }, { row: 4, col: 4, tier: 2 });

    expect(firstStack.success).toBe(true);
    expect(secondStack.success).toBe(true);

    const stackPeek = engine.getPieceAt({ row: 4, col: 4, tier: 2 });
    expect(stackPeek).toBeDefined();

    // Test that 4th level cannot be stacked
    const overStack = engine.makeMove({ row: 4, col: 4, tier: 2 }, { row: 4, col: 4, tier: 3 });
    expect(overStack.success).toBe(false);
  });

  it('Should detect game end conditions', () => {
    // Directly manipulate game state for this test
    engine.getGameState().capturedPieces.push({
      id: 'marshal_2',
      type: PieceType.MARSHAL,
      player: Player.PLAYER_2,
      position: { row: 0, col: 4, tier: 0 },
      isActive: false,
      moveCount: 5
    });

    engine['checkGameEnd']();
    expect(engine.getGameState().status).toBe(GameStatus.COMPLETED);
  });
});

import { GungiGameEngine } from '../backend/services/GungiGameEngine';
import { PieceType, Position } from '../backend/services/GungiGameEngine';

describe('Enhanced Gungi Engine', () => {
  let engine: GungiGameEngine;

  beforeEach(() => {
    engine = new GungiGameEngine('test-enhanced');
  });

  it('Should initialize 9x9 board correctly', () => {
    const board = engine.getGameState().board;
    expect(board.length).toBe(9);
    expect(board[0].length).toBe(9);
  });

  it('Should validate piece movements correctly', () => {
    const fromPos: Position = { row: 0, col: 0, tier: 0 };
    const toPos: Position = { row: 0, col: 1, tier: 0 };
    const piece = PieceType.PAWN;

    const moveResult = engine.makeMove(fromPos, toPos);
    expect(moveResult.success).toBe(true);
  });

  it('Should handle piece stacking (up to 3 levels)', () => {
    const position: Position = { row: 4, col: 4, tier: 0 };

    // Test stacking up to 3 pieces
    engine.makeMove({ row: 4, col: 4, tier: 0 }, { row: 4, col: 4, tier: 1 });
    engine.makeMove({ row: 4, col: 4, tier: 1 }, { row: 4, col: 4, tier: 2 });

    const stack = engine.getPieceAt({ row: 4, col: 4, tier: 2 });
    expect(stack).toBeDefined();

    // Test that 4th piece cannot be stacked
    const moveResult = engine.makeMove({ row: 4, col: 4, tier: 2 }, { row: 4, col: 4, tier: 3 });
    expect(moveResult.success).toBe(false);
  });

  it('Should detect game end conditions', () => {
    // Directly manipulate game state for the test
    engine['gameState'].capturedPieces.push({
      id: 'marshal_1',
      type: PieceType.MARSHAL,
      player: Player.PLAYER_2,
      position: { row: 0, col: 4, tier: 0 },
      isActive: false,
      moveCount: 5
    });

    engine.checkGameEnd();
    expect(engine.getGameState().status).toBe(GameStatus.COMPLETED);
  });
});

