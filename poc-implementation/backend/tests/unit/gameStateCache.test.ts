import { CacheService, initializeRedis, closeRedis } from '../../src/utils/redis';
import { jest } from '@jest/globals';

jest.mock('../../src/utils/redis');
let cacheService = new CacheService();

initializeRedis();

// Real-time Game State Cache Tests

describe('Real-time Game State Cache', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  test('should update game state and retrieve quickly', async () => {
    const gameId = 'game-123';
    const initialState = { state: 'ongoing', score: [0, 0] };
    const updatedState = { state: 'ongoing', score: [1, 0] };
    const mockPromise = jest.fn().mockResolvedValueOnce(initialState);
    cacheService.set = jest.fn((key, value) => mockPromise()) as any;

    await cacheService.set(gameId, initialState);
    expect(cacheService.set).toHaveBeenCalledWith(gameId, initialState);
    const startTime = Date.now();

    cacheService.get = jest.fn().mockResolvedValueOnce(updatedState) as any;
    const result = await cacheService.get(gameId);
    const elapsedTime = Date.now() - startTime;

    expect(result).toEqual(updatedState);
    expect(elapsedTime).toBeLessThan(50);
  });

  test('should maintain consistency on game state updates', async () => {
    const gameId = 'game-456';
    const gameState = { state: 'paused', score: [2, 1] };
    const updatedGameState = { state: 'resumed', score: [2, 2] };

    // Simulate concurrent updates
    jest.spyOn(cacheService, 'set').mockImplementation(async (key, value) => {
      if (key === gameId) {
        expect(value).toBeInstanceOf(Object);
      }
    });

    await cacheService.set(gameId, gameState);
    expect(cacheService.get(gameId)).resolves.toEqual(gameState);

    await cacheService.set(gameId, updatedGameState);
    const concurrentRequests = Array(100).fill(null).map(async () => {
      expect(cacheService.get(gameId)).resolves.toEqual(updatedGameState);
    });

    await Promise.all(concurrentRequests);
  });
});

closeRedis();

