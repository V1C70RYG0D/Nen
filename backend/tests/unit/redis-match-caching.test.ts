/**
 * Redis Match Caching Tests
 * Comprehensive test suite for Redis caching functionality specific to match operations
 * Following requirements: cache writes, reads, invalidation, error handling, TTL policies, and consistency
 */

import { CacheService, initializeRedis, closeRedis, checkRedisHealth } from '../../src/utils/redis';
import { jest } from '@jest/globals';

// Mock match data structures
interface MatchData {
  id: string;
  player1Id: string;
  player2Id: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  gameState?: any;
  odds?: {
    player1: number;
    player2: number;
  };
}

// Mock ioredis with extended functionality for comprehensive testing
const mockRedis = {
  ping: jest.fn() as jest.MockedFunction<() => Promise<string>>,
  setex: jest.fn() as jest.MockedFunction<(key: string, ttl: number, value: string) => Promise<string>>,
  get: jest.fn() as jest.MockedFunction<(key: string) => Promise<string | null>>,
  del: jest.fn() as jest.MockedFunction<(key: string) => Promise<number>>,
  exists: jest.fn() as jest.MockedFunction<(key: string) => Promise<number>>,
  mget: jest.fn() as jest.MockedFunction<(...keys: string[]) => Promise<(string | null)[]>>,
  incr: jest.fn() as jest.MockedFunction<(key: string) => Promise<number>>,
  expire: jest.fn() as jest.MockedFunction<(key: string, ttl: number) => Promise<number>>,
  lpush: jest.fn() as jest.MockedFunction<(key: string, value: string) => Promise<number>>,
  lrange: jest.fn() as jest.MockedFunction<(key: string, start: number, stop: number) => Promise<string[]>>,
  publish: jest.fn() as jest.MockedFunction<(channel: string, message: string) => Promise<number>>,
  pipeline: jest.fn() as jest.MockedFunction<() => any>,
  on: jest.fn() as jest.MockedFunction<(event: string, callback: Function) => void>,
  quit: jest.fn() as jest.MockedFunction<() => Promise<string>>,
  ttl: jest.fn() as jest.MockedFunction<(key: string) => Promise<number>>,
  scan: jest.fn() as jest.MockedFunction<(cursor: number) => Promise<[string, string[]]>>,
  flushall: jest.fn() as jest.MockedFunction<() => Promise<string>>,
  info: jest.fn() as jest.MockedFunction<() => Promise<string>>,
  disconnect: jest.fn() as jest.MockedFunction<() => void>,
};

const mockPipeline = {
  setex: jest.fn() as jest.MockedFunction<(key: string, ttl: number, value: string) => any>,
  incr: jest.fn() as jest.MockedFunction<(key: string) => any>,
  expire: jest.fn() as jest.MockedFunction<(key: string, ttl: number) => any>,
  exec: jest.fn() as jest.MockedFunction<() => Promise<any>>,
  del: jest.fn() as jest.MockedFunction<(key: string) => any>,
  get: jest.fn() as jest.MockedFunction<(key: string) => any>,
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

jest.mock('../../src/utils/logger');

describe('Redis Match Caching System', () => {
  let cacheService: CacheService;
  let mockMatchData: MatchData;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

mockRedis.pipeline.mockReturnValue(mockPipeline);
    mockRedis.ping.mockResolvedValue('PONG');
    mockRedis.setex.mockResolvedValue('OK');
    mockRedis.get.mockResolvedValue(null);
    mockRedis.del.mockResolvedValue(1);
    mockRedis.exists.mockResolvedValue(0);
    mockRedis.mget.mockResolvedValue([]);

    // Initialize Redis first
    await initializeRedis({
      host: 'localhost',
      port: 6379
    });

    // Initialize cache service
    cacheService = new CacheService();

    // Mock match data
    mockMatchData = {
      id: 'match-123',
      player1Id: 'player-456',
      player2Id: 'player-789',
      status: 'pending',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
      gameState: { board: 'initial', moves: [] },
      odds: { player1: 1.85, player2: 2.15 }
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Cache Writes on Match Creation and Updates', () => {
    const MATCH_CACHE_KEY = 'match:match-123';
    const MATCH_TTL = 3600; // 1 hour

    test('should cache match data on creation', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await cacheService.set(MATCH_CACHE_KEY, mockMatchData, MATCH_TTL);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        MATCH_CACHE_KEY,
        MATCH_TTL,
        JSON.stringify(mockMatchData)
      );
    });

    test('should cache match updates with new TTL', async () => {
      const updatedMatch = {
        ...mockMatchData,
        status: 'active' as const,
        updatedAt: new Date('2024-01-01T11:00:00Z'),
        gameState: { board: 'modified', moves: ['e2-e4'] }
      };

      mockRedis.setex.mockResolvedValue('OK');

      await cacheService.set(MATCH_CACHE_KEY, updatedMatch, MATCH_TTL);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        MATCH_CACHE_KEY,
        MATCH_TTL,
        JSON.stringify(updatedMatch)
      );
    });

    test('should batch cache multiple match updates', async () => {
      const matches = {
        'match:match-123': mockMatchData,
        'match:match-456': { ...mockMatchData, id: 'match-456' },
        'match:match-789': { ...mockMatchData, id: 'match-789', status: 'completed' as const }
      };

      mockPipeline.exec.mockResolvedValue([
        [null, 'OK'],
        [null, 'OK'],
        [null, 'OK']
      ]);

      await cacheService.mset(matches, MATCH_TTL);

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.setex).toHaveBeenCalledTimes(3);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    test('should handle cache write failures gracefully', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis write failed'));

      await expect(cacheService.set(MATCH_CACHE_KEY, mockMatchData, MATCH_TTL))
        .rejects.toThrow('Redis write failed');
    });
  });

  describe('Cache Reads Return Correct Match Data', () => {
    const MATCH_CACHE_KEY = 'match:match-123';

    test('should retrieve cached match data correctly', async () => {
      const serializedMatch = JSON.stringify(mockMatchData);
      mockRedis.get.mockResolvedValue(serializedMatch);

      const result = await cacheService.get<MatchData>(MATCH_CACHE_KEY);

      expect(mockRedis.get).toHaveBeenCalledWith(MATCH_CACHE_KEY);
      expect(result).toEqual(mockMatchData);
      expect(result?.id).toBe('match-123');
      expect(result?.status).toBe('pending');
    });

    test('should return null for non-existent match', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheService.get<MatchData>('match:non-existent');

      expect(result).toBeNull();
    });

    test('should retrieve multiple matches at once', async () => {
      const matchKeys = ['match:match-123', 'match:match-456', 'match:match-789'];
      const matchValues = [
        JSON.stringify(mockMatchData),
        JSON.stringify({ ...mockMatchData, id: 'match-456' }),
        null // Third match doesn't exist
      ];

      mockRedis.mget.mockResolvedValue(matchValues);

      const results = await cacheService.mget<MatchData>(matchKeys);

      expect(mockRedis.mget).toHaveBeenCalledWith(...matchKeys);
      expect(results).toHaveLength(3);
      expect(results[0]?.id).toBe('match-123');
      expect(results[1]?.id).toBe('match-456');
      expect(results[2]).toBeNull();
    });

    test('should handle malformed JSON in cache gracefully', async () => {
      const malformedJson = '{ invalid json structure';
      mockRedis.get.mockResolvedValue(malformedJson);

      const result = await cacheService.get<MatchData>(MATCH_CACHE_KEY);

      expect(result).toBe(malformedJson);
    });

    test('should validate match data structure after retrieval', async () => {
      const serializedMatch = JSON.stringify(mockMatchData);
      mockRedis.get.mockResolvedValue(serializedMatch);

      const result = await cacheService.get<MatchData>(MATCH_CACHE_KEY);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('player1Id');
      expect(result).toHaveProperty('player2Id');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });
  });

  describe('Cache Invalidation on Match Deletion', () => {
    const MATCH_CACHE_KEY = 'match:match-123';

    test('should delete match from cache', async () => {
      mockRedis.del.mockResolvedValue(1);

      await cacheService.del(MATCH_CACHE_KEY);

      expect(mockRedis.del).toHaveBeenCalledWith(MATCH_CACHE_KEY);
    });

    test('should verify match no longer exists after deletion', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const exists = await cacheService.exists(MATCH_CACHE_KEY);

      expect(mockRedis.exists).toHaveBeenCalledWith(MATCH_CACHE_KEY);
      expect(exists).toBe(false);
    });

    test('should batch delete multiple matches', async () => {
      const matchKeys = ['match:match-123', 'match:match-456', 'match:match-789'];

      mockPipeline.exec.mockResolvedValue([
        [null, 1],
        [null, 1],
        [null, 0] // Third match didn't exist
      ]);

      const pipeline = mockRedis.pipeline();
      matchKeys.forEach(key => pipeline.del(key));
      await pipeline.exec();

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.del).toHaveBeenCalledTimes(3);
    });

    test('should handle cache invalidation workflow', async () => {
      // First, verify match exists
      mockRedis.exists.mockResolvedValue(1);
      const existsBefore = await cacheService.exists(MATCH_CACHE_KEY);
      expect(existsBefore).toBe(true);

      // Delete the match
      mockRedis.del.mockResolvedValue(1);
      await cacheService.del(MATCH_CACHE_KEY);

      // Verify it no longer exists
      mockRedis.exists.mockResolvedValue(0);
      const existsAfter = await cacheService.exists(MATCH_CACHE_KEY);
      expect(existsAfter).toBe(false);
    });
  });

  describe('Redis Connection Failure Handling', () => {
    test('should handle connection errors during read operations', async () => {
      mockRedis.get.mockRejectedValue(new Error('Connection timeout'));

      await expect(cacheService.get('match:test'))
        .rejects.toThrow('Connection timeout');
    });

    test('should handle connection errors during write operations', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Connection refused'));

      await expect(cacheService.set('match:test', mockMatchData))
        .rejects.toThrow('Connection refused');
    });

    test('should handle connection errors during batch operations', async () => {
      mockPipeline.exec.mockRejectedValue(new Error('Pipeline execution failed'));

      await expect(cacheService.mset({ 'match:test': mockMatchData }))
        .rejects.toThrow('Pipeline execution failed');
    });

    test('should verify Redis health check failure', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Redis unavailable'));

      const isHealthy = await checkRedisHealth();

      expect(isHealthy).toBe(false);
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    test('should handle reconnection scenarios', async () => {
      // Simulate connection failure
      mockRedis.get.mockRejectedValueOnce(new Error('Connection lost'));

      await expect(cacheService.get('match:test')).rejects.toThrow('Connection lost');

      // Simulate successful reconnection
      mockRedis.get.mockResolvedValue(JSON.stringify(mockMatchData));

      const result = await cacheService.get<MatchData>('match:test');
      expect(result).toEqual(mockMatchData);
    });
  });

  describe('Cache TTL and Expiration Policies', () => {
    const MATCH_CACHE_KEY = 'match:match-123';

    test('should set match with default TTL', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await cacheService.set(MATCH_CACHE_KEY, mockMatchData); // Default TTL

      expect(mockRedis.setex).toHaveBeenCalledWith(
        MATCH_CACHE_KEY,
        3600, // Default TTL from CacheService
        JSON.stringify(mockMatchData)
      );
    });

    test('should set match with custom TTL', async () => {
      const customTTL = 1800; // 30 minutes
      mockRedis.setex.mockResolvedValue('OK');

      await cacheService.set(MATCH_CACHE_KEY, mockMatchData, customTTL);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        MATCH_CACHE_KEY,
        customTTL,
        JSON.stringify(mockMatchData)
      );
    });

    test('should verify key expiration after TTL', async () => {
      const shortTTL = 1; // 1 second
      mockRedis.setex.mockResolvedValue('OK');

      await cacheService.set(MATCH_CACHE_KEY, mockMatchData, shortTTL);

      // Fast-forward time past TTL
      jest.advanceTimersByTime(shortTTL * 1000 + 100);

      // Mock expired key behavior
      mockRedis.get.mockResolvedValue(null);
      mockRedis.exists.mockResolvedValue(0);

      const result = await cacheService.get(MATCH_CACHE_KEY);
      const exists = await cacheService.exists(MATCH_CACHE_KEY);

      expect(result).toBeNull();
      expect(exists).toBe(false);
    });

    test('should set different TTL for different match types', async () => {
      const activeMatchTTL = 1800; // 30 minutes for active matches
      const completedMatchTTL = 86400; // 24 hours for completed matches

      mockRedis.setex.mockResolvedValue('OK');

      // Active match
      const activeMatch = { ...mockMatchData, status: 'active' as const };
      await cacheService.set('match:active-123', activeMatch, activeMatchTTL);

      // Completed match
      const completedMatch = { ...mockMatchData, status: 'completed' as const };
      await cacheService.set('match:completed-123', completedMatch, completedMatchTTL);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'match:active-123',
        activeMatchTTL,
        JSON.stringify(activeMatch)
      );

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'match:completed-123',
        completedMatchTTL,
        JSON.stringify(completedMatch)
      );
    });

    test('should handle TTL-based cache eviction gracefully', async () => {
      // Set match with short TTL
      mockRedis.setex.mockResolvedValue('OK');
      await cacheService.set(MATCH_CACHE_KEY, mockMatchData, 1);

      // Initially exists
      mockRedis.exists.mockResolvedValue(1);
      expect(await cacheService.exists(MATCH_CACHE_KEY)).toBe(true);

      // After expiration
      jest.advanceTimersByTime(2000);
      mockRedis.exists.mockResolvedValue(0);
      mockRedis.get.mockResolvedValue(null);

      expect(await cacheService.exists(MATCH_CACHE_KEY)).toBe(false);
      expect(await cacheService.get(MATCH_CACHE_KEY)).toBeNull();
    });
  });

  describe('Cache Consistency Across Operations', () => {
    const MATCH_CACHE_KEY = 'match:match-123';

    test('should maintain consistency in write-read-delete cycle', async () => {
      // Write
      mockRedis.setex.mockResolvedValue('OK');
      await cacheService.set(MATCH_CACHE_KEY, mockMatchData);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        MATCH_CACHE_KEY,
        3600,
        JSON.stringify(mockMatchData)
      );

      // Read
      mockRedis.get.mockResolvedValue(JSON.stringify(mockMatchData));
      const retrievedMatch = await cacheService.get<MatchData>(MATCH_CACHE_KEY);
      expect(retrievedMatch).toEqual(mockMatchData);

      // Verify exists
      mockRedis.exists.mockResolvedValue(1);
      const exists = await cacheService.exists(MATCH_CACHE_KEY);
      expect(exists).toBe(true);

      // Delete
      mockRedis.del.mockResolvedValue(1);
      await cacheService.del(MATCH_CACHE_KEY);

      // Verify deletion
      mockRedis.exists.mockResolvedValue(0);
      mockRedis.get.mockResolvedValue(null);
      const existsAfterDelete = await cacheService.exists(MATCH_CACHE_KEY);
      const retrievedAfterDelete = await cacheService.get(MATCH_CACHE_KEY);

      expect(existsAfterDelete).toBe(false);
      expect(retrievedAfterDelete).toBeNull();
    });

    test('should handle concurrent operations consistently', async () => {
      const concurrentKeys = ['match:concurrent-1', 'match:concurrent-2', 'match:concurrent-3'];
      const matches = concurrentKeys.reduce((acc, key, index) => {
        acc[key] = { ...mockMatchData, id: `concurrent-${index + 1}` };
        return acc;
      }, {} as Record<string, MatchData>);

      // Batch write
      mockPipeline.exec.mockResolvedValue([[null, 'OK'], [null, 'OK'], [null, 'OK']]);
      await cacheService.mset(matches);

      // Batch read
      const serializedMatches = Object.values(matches).map(m => JSON.stringify(m));
      mockRedis.mget.mockResolvedValue(serializedMatches);
      const retrievedMatches = await cacheService.mget<MatchData>(concurrentKeys);

      expect(retrievedMatches).toHaveLength(3);
      retrievedMatches.forEach((match, index) => {
        expect(match?.id).toBe(`concurrent-${index + 1}`);
      });
    });

    test('should maintain cache consistency during match updates', async () => {
      // Initial cache
      mockRedis.setex.mockResolvedValue('OK');
      await cacheService.set(MATCH_CACHE_KEY, mockMatchData);

      // Update match
      const updatedMatch = {
        ...mockMatchData,
        status: 'active' as const,
        updatedAt: new Date('2024-01-01T12:00:00Z')
      };

      // Cache updated match
      await cacheService.set(MATCH_CACHE_KEY, updatedMatch);

      // Verify updated data is cached
      mockRedis.get.mockResolvedValue(JSON.stringify(updatedMatch));
      const retrievedMatch = await cacheService.get<MatchData>(MATCH_CACHE_KEY);

      expect(retrievedMatch?.status).toBe('active');
      expect(retrievedMatch?.updatedAt).toEqual(updatedMatch.updatedAt);
    });

    test('should handle cache consistency with complex match state updates', async () => {
      const gameStateUpdates = [
        { board: 'initial', moves: [] },
        { board: 'mid-game', moves: ['e2-e4', 'e7-e5'] },
        { board: 'end-game', moves: ['e2-e4', 'e7-e5', 'Nf3', 'Nc6'] }
      ];

      for (let i = 0; i < gameStateUpdates.length; i++) {
        const updatedMatch = {
          ...mockMatchData,
          gameState: gameStateUpdates[i],
          updatedAt: new Date(`2024-01-01T1${i}:00:00Z`)
        };

        mockRedis.setex.mockResolvedValue('OK');
        await cacheService.set(MATCH_CACHE_KEY, updatedMatch);

        mockRedis.get.mockResolvedValue(JSON.stringify(updatedMatch));
        const retrieved = await cacheService.get<MatchData>(MATCH_CACHE_KEY);

        expect(retrieved?.gameState).toEqual(gameStateUpdates[i]);
        expect(retrieved?.gameState.moves).toHaveLength(gameStateUpdates[i].moves.length);
      }
    });

    test('should verify cache integrity across different data types', async () => {
      const testCases = [
        { key: 'match:string', value: 'simple-string' },
        { key: 'match:number', value: 42 },
        { key: 'match:boolean', value: true },
        { key: 'match:object', value: mockMatchData },
        { key: 'match:array', value: [1, 2, 3, 'test'] },
        { key: 'match:null', value: null }
      ];

      for (const testCase of testCases) {
        mockRedis.setex.mockResolvedValue('OK');
        await cacheService.set(testCase.key, testCase.value);

        const serialized = typeof testCase.value === 'string'
          ? testCase.value
          : JSON.stringify(testCase.value);

        mockRedis.get.mockResolvedValue(serialized);
        const retrieved = await cacheService.get(testCase.key);

        if (typeof testCase.value === 'string') {
          expect(retrieved).toBe(testCase.value);
        } else {
          expect(retrieved).toEqual(testCase.value);
        }
      }
    });
  });

  describe('Performance and Optimization Tests', () => {
    test('should handle large match data efficiently', async () => {
      const largeMatchData = {
        ...mockMatchData,
        gameState: {
          board: 'complex-board-state'.repeat(1000),
          moves: Array.from({ length: 1000 }, (_, i) => `move-${i}`),
          metadata: Array.from({ length: 100 }, (_, i) => ({
            id: i,
            data: `metadata-${i}`.repeat(10)
          }))
        }
      };

      mockRedis.setex.mockResolvedValue('OK');

      const startTime = Date.now();
      await cacheService.set('match:large', largeMatchData);
      const endTime = Date.now();

      expect(mockRedis.setex).toHaveBeenCalled();
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });

    test('should optimize batch operations for multiple matches', async () => {
      const batchSize = 100;
      const matches = Array.from({ length: batchSize }, (_, i) => ({
        [`match:batch-${i}`]: { ...mockMatchData, id: `batch-${i}` }
      })).reduce((acc, curr) => ({ ...acc, ...curr }), {});

      mockPipeline.exec.mockResolvedValue(
        Array.from({ length: batchSize }, () => [null, 'OK'])
      );

      const startTime = Date.now();
      await cacheService.mset(matches);
      const endTime = Date.now();

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.setex).toHaveBeenCalledTimes(batchSize);
      expect(endTime - startTime).toBeLessThan(200); // Batch should be efficient
    });
  });
});

describe('Redis Infrastructure Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle Redis initialization with proper configuration', async () => {
    const config = {
      host: 'localhost',
      port: 6379,
      password: 'test-password',
      db: 0,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    };

    mockRedis.ping.mockResolvedValue('PONG');

    const redis = await initializeRedis(config);

    expect(redis).toBeDefined();
    expect(mockRedis.ping).toHaveBeenCalled();
    expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockRedis.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });

  test('should properly close Redis connections', async () => {
    mockRedis.quit.mockResolvedValue('OK');

    await closeRedis();

    expect(mockRedis.quit).toHaveBeenCalled();
  });

  test('should validate Redis health status', async () => {
    mockRedis.ping.mockResolvedValue('PONG');

    const isHealthy = await checkRedisHealth();

    expect(isHealthy).toBe(true);
    expect(mockRedis.ping).toHaveBeenCalled();
  });
});
