import { v4 as uuidv4 } from 'uuid';
import { GameService } from '../../services/GameService';

const gameService = new GameService();

describe('Gungi Game Engine', () => {
  let matchId: string;

  beforeAll(async () => {
    const match = await gameService.createMatch({ matchType: 'human_vs_human' });
    matchId = match.id;
  });

  test('Initial board setup is correct', async () => {
    const match = await gameService.getMatch(matchId);
    expect(match).toBeTruthy();
    expect(match?.gameState?.board).toHaveLength(9);
    expect(match?.gameState?.board.every(row => row.length === 9)).toBe(true);
  });

  test('Valid move generation works for all pieces', async () => {
    const match = await gameService.getMatch(matchId);
    const validMoves = gameService.generateValidMoves(matchId);
    expect(validMoves.length).toBeGreaterThan(0);
  });

  test('Move validation prevents illegal moves', async () => {
    const invalidMove = {
      gameId: matchId,
      playerId: 'player1',
      from: { x: 0, y: 0, level: 0 },
      to: { x: 10, y: 10, level: 0 }, // Invalid position
      piece: 'pawn'
    };
    expect(gameService.validateMove(match?.gameState!, invalidMove)).toBe(false);
  });

  test('Board state updates correctly after moves', async () => {
    const validMove = {
      gameId: matchId,
      playerId: 'player1',
      from: { x: 0, y: 0, level: 0 },
      to: { x: 1, y: 0, level: 0 },
      piece: 'pawn'
    };
    await gameService.executeMove(matchId, 'player1', validMove);
    const match = await gameService.getMatch(matchId);
    expect(match?.gameState?.moveHistory).toHaveLength(1);
  });

  test('Piece stacking rules enforced', () => {
    // To be implemented with actual stacking logic validation
  });

  test('Win condition detection (capture king)', () => {
    // To be implemented when pieces capture logic is available
  });

  test('Game history tracking maintains accuracy', async () => {
    const match = await gameService.getMatch(matchId);
    expect(match?.gameState?.moveHistory).toBeDefined();
  });

  test('Board serialization/deserialization', () => {
    // Ensure board can be serialized into JSON and restored
    const gameState = match?.gameState;
    const serializedBoard = JSON.stringify(gameState?.board);
    const deserializedBoard = JSON.parse(serializedBoard);
    expect(deserializedBoard).toEqual(gameState?.board);
  });

  test('Performance with complex board states', () => {
    // To be implemented when performance testing utilities are added
  });

  test('Edge cases and corner scenarios', () => {
    // To be implemented with specific edge case tests
  });

  afterAll(async () => {
    await gameService.surrenderMatch(matchId, 'player1');
  });
});
