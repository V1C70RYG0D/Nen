import { CacheService, initializeRedis, closeRedis } from '../../src/utils/redis';
import NodeCache from 'node-cache';
import { describe, beforeEach, test, expect } from '@jest/globals';

// Session Storage Cache Tests

initializeRedis();
describe('Session Storage Cache', () => {
  const cache = new NodeCache({ stdTTL: 3600 }); // 1-hour TTL

  beforeEach(() => {
    cache.flushAll();
  });

  test('should create and retrieve session', () => {
    const sessionId = 'session-id';
    const sessionData = { user: 'testUser', role: 'admin' };
    cache.set(sessionId, sessionData);
    expect(cache.get(sessionId)).toEqual(sessionData);
  });

  test('should expire session after TTL', (done) => {
    const sessionId = 'session-id';
    const sessionData = { user: 'testUser', role: 'admin' };
    cache.set(sessionId, sessionData, 0.5); // half a second TTL
    setTimeout(() => {
      expect(cache.get(sessionId)).toBeUndefined();
      done();
    }, 600);
  });

  test('should handle concurrent session access', async () => {
    const sessionId = 'session-id';
    const sessionData = { user: 'concurrentUser', role: 'user' };
    cache.set(sessionId, sessionData);
    const promises = Array.from({ length: 1000 }, async () => {
      return new Promise((resolve) => {
        setImmediate(() => {
          expect(cache.get(sessionId)).toEqual(sessionData);
          resolve();
        });
      });
    });
    await Promise.all(promises);
  });
});

closeRedis();

