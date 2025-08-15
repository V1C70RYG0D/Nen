import { initializeRedis, closeRedis } from '../../src/utils/redis';
import db from '../../src/models/database';
import { EnhancedDatabaseService } from '../../src/services/EnhancedDatabaseService';
import { CacheService } from '../../src/utils/redis';

let cacheService: CacheService;
let databaseService: EnhancedDatabaseService;

beforeAll(async () => {
  await initializeRedis();
  cacheService = new CacheService();
  databaseService = new EnhancedDatabaseService();
});

afterAll(async () => {
  await closeRedis();
  await db.disconnect();
});

describe('Database Synchronization Tests', () => {
  test('Persist initial match to database', async () => {
    const matchData = {
      player1Id: 'player-001',
      betAmount: 100,
    };

    const match = await db.createGame(matchData);
    expect(match).toHaveProperty('id');

    const dbMatch = await db.getGameById(match.id);
    expect(dbMatch).toMatchObject(matchData);
  });

  test('Correctly synchronize updates', async () => {
    const matchData = {
      player1Id: 'player-001',
      betAmount: 100,
    };
    const match = await db.createGame(matchData);
    await db.updateGame(match.id, { status: 'in_progress' });

    const updatedMatch = await db.getGameById(match.id);
    expect(updatedMatch?.status).toBe('in_progress');
  });

  test('Rollback on transaction failure', async () => {
    const matchData = {
      player1Id: 'player-001',
      betAmount: 100,
    };

    await expect(
      db.prisma.$transaction(async (tx) => {
        await tx.game.create({ data: matchData });
        throw new Error('Forced error');
      }),
    ).rejects.toThrow('Forced error');

    const matches = await db.getActiveMatches();
    expect(matches.length).toBe(0);
  });

  test('Validate integrity between cache and database', async () => {
    const matchData = {
      player1Id: 'player-002',
      betAmount: 200,
    };

    await databaseService.cachedQuery('match:test', async () => matchData);
    const cachedMatch = await cacheService.get('match:test');

    expect(cachedMatch).toMatchObject(matchData);
  });

  test('Handle bulk synchronization', async () => {
    const matchesData = [
      { player1Id: 'p1', betAmount: 100 },
      { player1Id: 'p2', betAmount: 200 },
      { player1Id: 'p3', betAmount: 300 },
    ];

    const matchPromises = matchesData.map((data) => db.createGame(data));
    const results = await Promise.all(matchPromises);

    expect(results.length).toBe(matchesData.length);
  });

  test('Database connection issues are handled', async () => {
    // Intentionally provide wrong connection details
    db.prisma = new db.prisma.constructor({
      datasources: {
        db: {
          url: 'postgresql://user:pass@invalid-host/db',
        },
      },
    });

    await expect(db.connect()).rejects.toThrow();
  });
});
