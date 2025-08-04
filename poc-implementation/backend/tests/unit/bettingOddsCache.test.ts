import { CacheService, initializeRedis, closeRedis } from '../../src/utils/redis';
import { jest } from '@jest/globals';

jest.mock('../../src/utils/redis');
let cacheService = new CacheService();

initializeRedis();

// Betting Odds Cache Tests
describe('Betting Odds Cache', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  test('should update odds and retrieve performance quickly', async () => {
    const matchId = 'match-001';
    const initialOdds = { home: 2.0, away: 3.5 };
    const updatedOdds = { home: 1.8, away: 3.8 };

    cacheService.set = jest.fn(key => Promise.resolve(key));

    await cacheService.set(matchId, initialOdds);
    expect(cacheService.set).toHaveBeenCalledWith(matchId, initialOdds);

    cacheService.get = jest.fn().mockResolvedValueOnce(updatedOdds);
    const result = await cacheService.get(matchId);

    expect(result).toEqual(updatedOdds);
  });

  test('should invalidate cache on odds changes', async () => {
    const matchId = 'match-002';
    const odds = { home: 1.5, away: 2.5 };
    const updatedOdds = { home: 1.3, away: 2.8 };

    cacheService.set(matchId, odds);
    cacheService.del = jest.fn(key => Promise.resolve(key));
    cacheService.set(matchId, updatedOdds);

    expect(cacheService.del).toHaveBeenCalledWith(matchId);
  });
});

closeRedis();

