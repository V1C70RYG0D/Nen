import { initializeRedis, closeRedis, CacheService } from '../../src/utils/redis';
import db from '../../src/models/database';
import { EnhancedDatabaseService } from '../../src/services/EnhancedDatabaseService';
import { EnhancedCachingService } from '../../src/services/EnhancedCachingService';
import { AdvancedErrorRecovery } from '../../src/middleware/advancedErrorRecovery';
import { GungiGameEngine, GameState, PieceType, Player } from '../../src/services/GungiGameEngine';
import { GameService } from '../../src/services/GameService';
import { logger } from '../../src/utils/logger';

let cachingService: EnhancedCachingService;
let databaseService: EnhancedDatabaseService;

beforeAll(async () => {
  await initializeRedis();
  cachingService = new EnhancedCachingService();
  databaseService = new EnhancedDatabaseService();
});

afterAll(async () => {
  await closeRedis();
  await db.disconnect();
});

describe('Resilience and Recovery Tests', () => {
  test('Match state recovery from persistent storage', async () => {
    const matchData = {
      player1Id: 'player-001',
      betAmount: 100,
    };

    const match = await db.createGame(matchData);
    const initialState = await db.getGameById(match.id);
    expect(initialState).not.toBeNull();

    await cachingService.cacheGameState(match.id, initialState);
    const recoveredState = await cachingService.getCachedGameState(match.id);
    expect(recoveredState).toEqual(initialState);
  });

  test('Verify in-memory state reconstruction', () => {
    const engine = new GungiGameEngine('test-recovery');
    const initialState = engine.getGameState();
    const serializedState = engine.exportGameState();

    const newEngine = new GungiGameEngine('test-reconstruction');
    newEngine.importGameState(serializedState);
    const reconstructedState = newEngine.getGameState();

    expect(reconstructedState).toEqual(initialState);
  });

  test('Test partial recovery scenarios', async () => {
    const context = {
      requestId: 'test-partial',
      timestamp: new Date(),
      method: 'GET',
      url: '/recovery-test'
    };
    const errorRecovery = AdvancedErrorRecovery.getInstance();

    const error = new Error('Partial network failure');
    const result = await errorRecovery.attemptRecovery(error, context);
    expect(result.recovered).toBe(true);
  });

  test('Validate data integrity after recovery', async () => {
    const matchData = {
      player1Id: 'player-002',
      betAmount: 200,
    };

    const match = await db.createGame(matchData);
    const integrityState = await db.getGameById(match.id);
    const recoveredState = await cachingService.getCachedGameState(match.id);

    expect(recoveredState).toMatchObject(integrityState);
  });

  test('Test recovery performance metrics', async () => {
    const start = Date.now();

    const matchData = {
      player1Id: 'player-003',
      betAmount: 300,
    };

    const match = await db.createGame(matchData);
    await cachingService.cacheGameState(match.id, match);

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000);  // Recovery should be quick
  });

  test('Verify no data loss during restart', async () => {
    const matchData = {
      player1Id: 'player-004',
      betAmount: 400,
    };

    const match = await db.createGame(matchData);
    await cachingService.cacheGameState(match.id, match);

    await closeRedis();
    await initializeRedis();

    const recoveredState = await cachingService.getCachedGameState(match.id);
    expect(recoveredState).toEqual(match);
  });
});

