/**
 * Database and Cache Integration Tests
 * Tests interactions between database, caching layer, and data consistency
 */

import {
  setupIntegrationEnvironment,
  teardownIntegrationEnvironment,
  getTestEnvironment,
  createTestData,
  testDatabaseConnection,
  testRedisConnection,
  IntegrationTestConfig
} from '../setup/integration-setup';
import { BettingService } from '../../src/services/BettingService';
import { GameService } from '../../src/services/GameService';
import { logger } from '../../src/utils/logger';

describe('Database and Cache Integration Tests', () => {
  let testEnv: IntegrationTestConfig;
  let testData: any;
  let bettingService: BettingService;
  let gameService: GameService;

  beforeAll(async () => {
    testEnv = await setupIntegrationEnvironment();
    testData = await createTestData();
    
    // Initialize services that depend on database and cache
    bettingService = new BettingService();
    gameService = new GameService();
  }, 60000);

  afterAll(async () => {
    await teardownIntegrationEnvironment();
  }, 30000);

  describe('Database Connection and Operations', () => {
    test('should maintain stable database connection', async () => {
      const isConnected = await testDatabaseConnection();
      expect(isConnected).toBe(true);

      // Test multiple consecutive queries
      for (let i = 0; i < 10; i++) {
        const result = await testEnv.database.client.$queryRaw`SELECT NOW()`;
        expect(result).toBeTruthy();
      }
    });

    test('should handle concurrent database operations', async () => {
      const concurrentOperations = Array.from({ length: 20 }, (_, i) => 
        testEnv.database.client.user.findMany({
          take: 10,
          skip: i * 5
        })
      );

      const results = await Promise.allSettled(concurrentOperations);
      
      // All operations should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBe(concurrentOperations.length);
    });

    test('should enforce database constraints and transactions', async () => {
      // Test unique constraint enforcement
      const userData = {
        id: 'test-unique-user',
        username: 'unique-test-user',
        email: 'unique@test.com',
        publicKey: 'unique-public-key',
        address: 'unique-address',
        isActive: true,
        level: 1,
        experience: 0
      };

      // First creation should succeed
      const user1 = await testEnv.database.client.user.create({ data: userData });
      expect(user1.id).toBe(userData.id);

      // Second creation with same ID should fail
      await expect(
        testEnv.database.client.user.create({ data: userData })
      ).rejects.toThrow();

      // Cleanup
      await testEnv.database.client.user.delete({
        where: { id: userData.id }
      });
    });

    test('should handle complex queries with joins and aggregations', async () => {
      // Test complex query with user stats and betting data
      const userWithStats = await testEnv.database.client.user.findFirst({
        where: { id: testData.users[0].id },
        include: {
          bets: {
            take: 10,
            orderBy: { createdAt: 'desc' }
          },
          gamesAsPlayer1: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          },
          gamesAsPlayer2: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      expect(userWithStats).toBeTruthy();
      expect(userWithStats?.id).toBe(testData.users[0].id);
      expect(userWithStats?.bets).toBeDefined();
      expect(userWithStats?.gamesAsPlayer1).toBeDefined();
      expect(userWithStats?.gamesAsPlayer2).toBeDefined();
    });

    test('should handle database migrations and schema changes gracefully', async () => {
      // Test that current schema is accessible
      const tables = await testEnv.database.client.$queryRaw<any[]>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      
      const expectedTables = ['User', 'Game', 'Bet'];
      const tableNames = tables.map(t => t.table_name);
      
      expectedTables.forEach(expectedTable => {
        expect(tableNames).toContain(expectedTable);
      });
    });
  });

  describe('Cache Operations and Consistency', () => {
    beforeEach(async () => {
      // Clear cache before each test
      if (testEnv.redis.isConnected) {
        await testEnv.redis.client.flushall();
      }
    });

    test('should handle basic cache operations', async () => {
      if (!testEnv.redis.isConnected) {
        console.log('Redis not available, skipping cache tests');
        return;
      }

      const testKey = 'test-cache-key';
      const testData = { id: '123', name: 'Test Data', timestamp: Date.now() };

      // Set cache
      await testEnv.redis.client.setex(testKey, 300, JSON.stringify(testData));

      // Get cache
      const cachedData = await testEnv.redis.client.get(testKey);
      expect(JSON.parse(cachedData!)).toEqual(testData);

      // Delete cache
      await testEnv.redis.client.del(testKey);
      const deletedData = await testEnv.redis.client.get(testKey);
      expect(deletedData).toBeNull();
    });

    test('should handle cache expiration correctly', async () => {
      if (!testEnv.redis.isConnected) {
        return;
      }

      const testKey = 'test-expiration-key';
      const testValue = 'test-value';

      // Set with 2-second expiration
      await testEnv.redis.client.setex(testKey, 2, testValue);

      // Should exist immediately
      const immediate = await testEnv.redis.client.get(testKey);
      expect(immediate).toBe(testValue);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Should be expired
      const expired = await testEnv.redis.client.get(testKey);
      expect(expired).toBeNull();
    }, 10000);

    test('should maintain cache consistency during concurrent operations', async () => {
      if (!testEnv.redis.isConnected) {
        return;
      }

      const baseKey = 'concurrent-test';
      const operations = Array.from({ length: 50 }, (_, i) => {
        const key = `${baseKey}-${i}`;
        const value = `value-${i}`;
        return testEnv.redis.client.setex(key, 60, value);
      });

      await Promise.all(operations);

      // Verify all keys were set
      for (let i = 0; i < 50; i++) {
        const key = `${baseKey}-${i}`;
        const value = await testEnv.redis.client.get(key);
        expect(value).toBe(`value-${i}`);
      }

      // Cleanup
      const keys = Array.from({ length: 50 }, (_, i) => `${baseKey}-${i}`);
      await testEnv.redis.client.del(...keys);
    });

    test('should handle complex data structures in cache', async () => {
      if (!testEnv.redis.isConnected) {
        return;
      }

      const complexData = {
        user: {
          id: 'user-123',
          profile: {
            username: 'testuser',
            stats: {
              gamesPlayed: 100,
              gamesWon: 65,
              winRate: 0.65,
              achievements: ['first_win', 'veteran_player', 'lucky_streak']
            }
          }
        },
        preferences: {
          theme: 'dark',
          notifications: true,
          language: 'en'
        },
        metadata: {
          lastLogin: new Date().toISOString(),
          sessionCount: 42
        }
      };

      const cacheKey = 'complex-data-test';
      await testEnv.redis.client.setex(cacheKey, 300, JSON.stringify(complexData));

      const retrieved = await testEnv.redis.client.get(cacheKey);
      const parsedData = JSON.parse(retrieved!);

      expect(parsedData).toEqual(complexData);
      expect(parsedData.user.profile.stats.achievements).toHaveLength(3);
      expect(parsedData.preferences.theme).toBe('dark');

      await testEnv.redis.client.del(cacheKey);
    });
  });

  describe('Database-Cache Synchronization', () => {
    test('should maintain consistency between database and cache', async () => {
      if (!testEnv.redis.isConnected) {
        console.log('Redis not available, skipping sync tests');
        return;
      }

      const testUser = testData.users[0];
      const cacheKey = `user:${testUser.id}`;

      // Store user in cache
      await testEnv.redis.client.setex(cacheKey, 300, JSON.stringify(testUser));

      // Update user in database
      const updatedData = { username: 'updated-username' };
      const updatedUser = await testEnv.database.client.user.update({
        where: { id: testUser.id },
        data: updatedData
      });

      // Cache should be invalidated/updated
      await testEnv.redis.client.del(cacheKey);
      await testEnv.redis.client.setex(cacheKey, 300, JSON.stringify(updatedUser));

      // Verify consistency
      const cachedUser = JSON.parse(await testEnv.redis.client.get(cacheKey)!);
      expect(cachedUser.username).toBe(updatedData.username);
      expect(cachedUser.username).toBe(updatedUser.username);

      // Reset user data
      await testEnv.database.client.user.update({
        where: { id: testUser.id },
        data: { username: testUser.username }
      });
    });

    test('should handle cache miss scenarios gracefully', async () => {
      if (!testEnv.redis.isConnected) {
        return;
      }

      const testUser = testData.users[0];
      const cacheKey = `user:${testUser.id}`;

      // Ensure cache is empty
      await testEnv.redis.client.del(cacheKey);

      // Simulate cache miss - should fetch from database
      let userData = await testEnv.redis.client.get(cacheKey);
      
      if (!userData) {
        // Cache miss - fetch from database
        const dbUser = await testEnv.database.client.user.findUnique({
          where: { id: testUser.id }
        });
        
        expect(dbUser).toBeTruthy();
        
        // Store in cache for future requests
        if (dbUser) {
          await testEnv.redis.client.setex(cacheKey, 300, JSON.stringify(dbUser));
          userData = JSON.stringify(dbUser);
        }
      }

      const parsedUser = JSON.parse(userData!);
      expect(parsedUser.id).toBe(testUser.id);

      // Subsequent request should hit cache
      const cachedUserData = await testEnv.redis.client.get(cacheKey);
      expect(cachedUserData).toBeTruthy();
      expect(JSON.parse(cachedUserData!).id).toBe(testUser.id);
    });

    test('should handle write-through caching pattern', async () => {
      if (!testEnv.redis.isConnected) {
        return;
      }

      // Create new user with write-through pattern
      const newUserData = {
        id: 'write-through-test-user',
        username: 'writethrough',
        email: 'writethrough@test.com',
        publicKey: 'writethrough-key',
        address: 'writethrough-address',
        isActive: true,
        level: 1,
        experience: 0
      };

      // Write to database
      const createdUser = await testEnv.database.client.user.create({
        data: newUserData
      });

      // Immediately write to cache (write-through pattern)
      const cacheKey = `user:${createdUser.id}`;
      await testEnv.redis.client.setex(cacheKey, 300, JSON.stringify(createdUser));

      // Verify both database and cache have the data
      const dbUser = await testEnv.database.client.user.findUnique({
        where: { id: createdUser.id }
      });
      const cachedUser = JSON.parse(await testEnv.redis.client.get(cacheKey)!);

      expect(dbUser).toEqual(createdUser);
      expect(cachedUser).toEqual(createdUser);

      // Cleanup
      await testEnv.database.client.user.delete({
        where: { id: createdUser.id }
      });
      await testEnv.redis.client.del(cacheKey);
    });

    test('should handle cache invalidation on updates', async () => {
      if (!testEnv.redis.isConnected) {
        return;
      }

      const testUser = testData.users[0];
      const cacheKey = `user:${testUser.id}`;
      const statsCacheKey = `user:${testUser.id}:stats`;

      // Set initial cache
      await testEnv.redis.client.setex(cacheKey, 300, JSON.stringify(testUser));
      await testEnv.redis.client.setex(statsCacheKey, 300, JSON.stringify({
        gamesPlayed: 10,
        gamesWon: 5,
        winRate: 0.5
      }));

      // Update user in database
      const updatedUser = await testEnv.database.client.user.update({
        where: { id: testUser.id },
        data: { level: testUser.level + 1 }
      });

      // Invalidate related caches
      await testEnv.redis.client.del(cacheKey);
      await testEnv.redis.client.del(statsCacheKey);

      // Verify caches are empty
      const cachedUser = await testEnv.redis.client.get(cacheKey);
      const cachedStats = await testEnv.redis.client.get(statsCacheKey);

      expect(cachedUser).toBeNull();
      expect(cachedStats).toBeNull();

      // Reset user data
      await testEnv.database.client.user.update({
        where: { id: testUser.id },
        data: { level: testUser.level }
      });
    });
  });

  describe('Service-Level Integration', () => {
    test('should handle betting service database operations', async () => {
      // This test would require proper BettingService implementation
      // For now, we'll test database operations directly
      
      const testGame = testData.games[0];
      const testUser = testData.users[0];

      // Create a betting pool entry
      const betData = {
        id: `test-bet-${Date.now()}`,
        userId: testUser.id,
        gameId: testGame.id,
        amount: 10.5,
        agentId: 'test-agent',
        odds: 2.5,
        status: 'placed' as const,
        payout: 0,
        placedAt: new Date(),
        settledAt: new Date()
      };

      const createdBet = await testEnv.database.client.bet.create({
        data: betData
      });

      expect(createdBet.id).toBe(betData.id);
      expect(createdBet.amount).toBe(betData.amount);

      // Test bet retrieval with user information
      const betWithUser = await testEnv.database.client.bet.findUnique({
        where: { id: createdBet.id },
        include: {
          user: true,
          game: true
        }
      });

      expect(betWithUser?.user.id).toBe(testUser.id);
      expect(betWithUser?.game.id).toBe(testGame.id);

      // Cleanup
      await testEnv.database.client.bet.delete({
        where: { id: createdBet.id }
      });
    });

    test('should handle game state persistence and retrieval', async () => {
      const gameData = {
        id: `test-game-${Date.now()}`,
        player1Id: testData.users[0].id,
        player2Id: testData.users[1].id,
        status: 'in_progress' as const,
        gameType: 'vs_human' as const,
        isActive: true,
        currentState: {
          board: [
            [null, 'p1', null],
            [null, null, 'p2'],
            ['p1', null, null]
          ],
          currentPlayer: 'player1',
          moveCount: 3
        }
      };

      const createdGame = await testEnv.database.client.game.create({
        data: {
          ...gameData,
          currentState: JSON.stringify(gameData.currentState)
        }
      });

      expect(createdGame.id).toBe(gameData.id);
      expect(JSON.parse(createdGame.currentState || '{}')).toEqual(gameData.currentState);

      // Test game updates
      const updatedState = {
        ...gameData.currentState,
        moveCount: 4,
        currentPlayer: 'player2'
      };

      const updatedGame = await testEnv.database.client.game.update({
        where: { id: createdGame.id },
        data: {
          currentState: JSON.stringify(updatedState)
        }
      });

      expect(JSON.parse(updatedGame.currentState || '{}')).toEqual(updatedState);

      // Cleanup
      await testEnv.database.client.game.delete({
        where: { id: createdGame.id }
      });
    });

    test('should handle complex queries for leaderboards and statistics', async () => {
      // Create some test betting data
      const testBets = [];
      for (let i = 0; i < 5; i++) {
        const betData = {
          id: `leaderboard-bet-${i}`,
          userId: testData.users[i % 2].id, // Alternate between users
          gameId: testData.games[0].id,
          amount: (i + 1) * 10,
          agentId: `agent-${i}`,
          odds: 1.5 + (i * 0.1),
          status: 'settled' as const,
          payout: (i + 1) * 15,
          placedAt: new Date(),
          settledAt: new Date()
        };

        const bet = await testEnv.database.client.bet.create({ data: betData });
        testBets.push(bet);
      }

      // Query user betting statistics
      const userStats = await testEnv.database.client.user.findMany({
        where: {
          id: { in: [testData.users[0].id, testData.users[1].id] }
        },
        include: {
          bets: {
            where: { status: 'settled' },
            orderBy: { placedAt: 'desc' }
          }
        }
      });

      expect(userStats).toHaveLength(2);
      userStats.forEach(user => {
        expect(user.bets.length).toBeGreaterThan(0);
      });

      // Test aggregation query
      const betAggregation = await testEnv.database.client.bet.aggregate({
        where: {
          id: { in: testBets.map(b => b.id) }
        },
        _sum: {
          amount: true,
          payout: true
        },
        _avg: {
          odds: true
        },
        _count: {
          id: true
        }
      });

      expect(betAggregation._sum.amount).toBeGreaterThan(0);
      expect(betAggregation._sum.payout).toBeGreaterThan(0);
      expect(betAggregation._avg.odds).toBeGreaterThan(1);
      expect(betAggregation._count.id).toBe(5);

      // Cleanup test bets
      await testEnv.database.client.bet.deleteMany({
        where: {
          id: { in: testBets.map(b => b.id) }
        }
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle database transaction rollbacks', async () => {
      const initialUserCount = await testEnv.database.client.user.count();

      try {
        await testEnv.database.client.$transaction(async (tx) => {
          // Create a user
          await tx.user.create({
            data: {
              id: 'transaction-test-user',
              username: 'transaction-test',
              email: 'transaction@test.com',
              publicKey: 'transaction-key',
              address: 'transaction-address',
              isActive: true,
              level: 1,
              experience: 0
            }
          });

          // Create a game
          await tx.game.create({
            data: {
              id: 'transaction-test-game',
              player1Id: 'transaction-test-user',
              player2Id: testData.users[0].id,
              status: 'pending',
              gameType: 'vs_ai',
              isActive: true
            }
          });

          // Force transaction failure
          throw new Error('Forced transaction failure');
        });
      } catch (error) {
        expect(error.message).toBe('Forced transaction failure');
      }

      // Verify rollback - counts should be unchanged
      const finalUserCount = await testEnv.database.client.user.count();
      const gameExists = await testEnv.database.client.game.findUnique({
        where: { id: 'transaction-test-game' }
      });

      expect(finalUserCount).toBe(initialUserCount);
      expect(gameExists).toBeNull();
    });

    test('should handle cache connection failures gracefully', async () => {
      if (!testEnv.redis.isConnected) {
        return;
      }

      // Test graceful degradation when cache is unavailable
      const originalClient = testEnv.redis.client;
      
      // Temporarily disconnect Redis
      testEnv.redis.client.disconnect();
      
      // Application should continue working without cache
      const user = await testEnv.database.client.user.findUnique({
        where: { id: testData.users[0].id }
      });
      expect(user).toBeTruthy();

      // Restore Redis connection
      testEnv.redis.client = originalClient;
    });

    test('should handle partial database failures', async () => {
      // Test handling of constraint violations
      const duplicateData = {
        id: testData.users[0].id, // Duplicate ID
        username: 'duplicate-test',
        email: 'duplicate@test.com',
        publicKey: 'duplicate-key',
        address: 'duplicate-address',
        isActive: true,
        level: 1,
        experience: 0
      };

      await expect(
        testEnv.database.client.user.create({ data: duplicateData })
      ).rejects.toThrow();

      // Database should still be functional for valid operations
      const validUser = await testEnv.database.client.user.findUnique({
        where: { id: testData.users[0].id }
      });
      expect(validUser).toBeTruthy();
    });
  });
});
