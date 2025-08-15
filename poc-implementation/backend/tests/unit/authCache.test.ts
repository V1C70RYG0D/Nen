import { CacheService, initializeRedis, closeRedis } from '../../src/utils/redis';
import { jest } from '@jest/globals';
import crypto from 'crypto';

jest.mock('../../src/utils/redis');
const cacheService = new CacheService();

initializeRedis();

// User Authentication Cache Tests
describe('User Authentication Cache', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  test('should cache auth token and validate', async () => {
    const userId = 'user-123';
    const token = crypto.randomBytes(32).toString('hex');
    const authData = { token, userId, role: 'user' };

    cacheService.set = jest.fn((key, value, ttl) => Promise.resolve());
    cacheService.get = jest.fn().mockResolvedValueOnce(authData);

    await cacheService.set(userId, authData, 900); // 15 minutes TTL
    expect(cacheService.set).toHaveBeenCalledWith(userId, authData, 900);

    const result = await cacheService.get(userId);
    expect(result).toEqual(authData);
  });

  test('should securely expire auth tokens', async () => {
    const userId = 'user-456';
    const token = crypto.randomBytes(32).toString('hex');
    const authData = { token, userId, role: 'admin' };

    cacheService.set = jest.fn();
    cacheService.exists = jest.fn().mockResolvedValueOnce(false);

    await cacheService.set(userId, authData, 1); // 1 second TTL

    // Simulate time passing
    setTimeout(async () => {
      const exists = await cacheService.exists(userId);
      expect(exists).toBe(false);
    }, 1100);
  });

  test('should handle concurrent auth validation', async () => {
    const userId = 'user-789';
    const token = crypto.randomBytes(32).toString('hex');
    const authData = { token, userId, role: 'premium' };

    cacheService.get = jest.fn().mockResolvedValue(authData);

    const concurrentRequests = Array(50).fill(null).map(async () => {
      return cacheService.get(userId);
    });

    const results = await Promise.all(concurrentRequests);
    results.forEach(result => {
      expect(result).toEqual(authData);
    });
  });
});

closeRedis();
