import { CacheService, initializeRedis, closeRedis, checkRedisHealth } from '../../src/utils/redis';
import { jest } from '@jest/globals';

// Mock ioredis
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
};

const mockPipeline = {
  setex: jest.fn() as jest.MockedFunction<(key: string, ttl: number, value: string) => any>,
  incr: jest.fn() as jest.MockedFunction<(key: string) => any>,
  expire: jest.fn() as jest.MockedFunction<(key: string, ttl: number) => any>,
  exec: jest.fn() as jest.MockedFunction<() => Promise<any>>,
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

// New test cases

import { performance } from 'perf_hooks'; // Necessary for measuring performance
import NodeCache from 'node-cache';

describe('In-Memory Cache Tests', () => {
  let cache;

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new NodeCache({ stdTTL: 1, checkperiod: 0.2 }); // 1 second TTL, 0.2 seconds check period
  });

  test('should retrieve cache under 1ms', () => {
    const key = 'performance-key';
    const value = 'fast-retrieval';
    cache.set(key, value);
    const startTime = performance.now();
    const result = cache.get(key);
    const duration = performance.now() - startTime;

    expect(result).toBe(value);
    expect(duration).toBeLessThan(1);
  });

  test('should respect memory capacity limits', () => {
    cache = new NodeCache({ maxKeys: 3 }); // Limit keys
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');

    expect(cache.keys().length).toBe(3);

    cache.set('key4', 'value4');
    expect(cache.keys().length).toBeLessThanOrEqual(3); // LRU Cache Eviction
  });

  test('should correctly expire keys after TTL', (done) => {
    const key = 'ttl-key';
    const value = 'temporary';
    cache.set(key, value, 0.5); // set to expire in 0.5 seconds
    expect(cache.get(key)).toBe(value);

    setTimeout(() => {
      expect(cache.get(key)).toBeNull();
      done();
    }, 600); // check after 0.6 seconds
  });

  test('should handle concurrent access', async () => {
    const key = 'concurrent-key';
    const value = 'thread-safe-value';
    cache.set(key, value);

    const promises = Array(1000).fill('').map(() => {
      return new Promise((resolve) => {
        setImmediate(() => {
          expect(cache.get(key)).toBe(value);
          resolve();
        });
      });
    });

    await Promise.all(promises);
  });
});

jest.mock('../../src/utils/logger');

describe('Redis CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.pipeline.mockReturnValue(mockPipeline);

    // Mock successful Redis connection
    mockRedis.ping.mockResolvedValue('PONG');

    // Initialize Redis and create cache service
    cacheService = new CacheService();
  });

  describe('Basic Cache Operations', () => {
    test('should set cache value with TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };
      const ttl = 300;

      mockRedis.setex.mockResolvedValue('OK');

      await cacheService.set(key, value, ttl);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        key,
        ttl,
        JSON.stringify(value)
      );
    });

    test('should set string value without JSON serialization', async () => {
      const key = 'string-key';
      const value = 'simple-string';
      const ttl = 600;

      mockRedis.setex.mockResolvedValue('OK');

      await cacheService.set(key, value, ttl);

      expect(mockRedis.setex).toHaveBeenCalledWith(key, ttl, value);
    });

    test('should get and parse JSON cache value', async () => {
      const key = 'json-key';
      const originalValue = { id: 123, name: 'test' };
      const serializedValue = JSON.stringify(originalValue);

      mockRedis.get.mockResolvedValue(serializedValue);

      const result = await cacheService.get(key);

      expect(mockRedis.get).toHaveBeenCalledWith(key);
      expect(result).toEqual(originalValue);
    });

    test('should return string value when JSON parsing fails', async () => {
      const key = 'string-key';
      const value = 'plain-string';

      mockRedis.get.mockResolvedValue(value);

      const result = await cacheService.get(key);

      expect(result).toBe(value);
    });

    test('should return null for non-existent key', async () => {
      const key = 'missing-key';

      mockRedis.get.mockResolvedValue(null);

      const result = await cacheService.get(key);

      expect(result).toBeNull();
    });

    test('should delete cache key', async () => {
      const key = 'delete-key';

      mockRedis.del.mockResolvedValue(1);

      await cacheService.del(key);

      expect(mockRedis.del).toHaveBeenCalledWith(key);
    });

    test('should check if key exists', async () => {
      const key = 'exists-key';

      mockRedis.exists.mockResolvedValue(1);

      const exists = await cacheService.exists(key);

      expect(mockRedis.exists).toHaveBeenCalledWith(key);
      expect(exists).toBe(true);

      mockRedis.exists.mockResolvedValue(0);
      const notExists = await cacheService.exists(key);
      expect(notExists).toBe(false);
    });
  });

  describe('Batch Operations', () => {
    test('should set multiple keys with pipeline', async () => {
      const keyValuePairs = {
        'key1': { data: 'value1' },
        'key2': 'value2',
        'key3': { nested: { data: 'value3' } }
      };
      const ttl = 300;

      mockPipeline.exec.mockResolvedValue([]);

      await cacheService.mset(keyValuePairs, ttl);

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.setex).toHaveBeenCalledTimes(3);
      expect(mockPipeline.setex).toHaveBeenCalledWith('key1', ttl, JSON.stringify(keyValuePairs.key1));
      expect(mockPipeline.setex).toHaveBeenCalledWith('key2', ttl, keyValuePairs.key2);
      expect(mockPipeline.setex).toHaveBeenCalledWith('key3', ttl, JSON.stringify(keyValuePairs.key3));
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    test('should get multiple keys', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const values = [
        JSON.stringify({ data: 'value1' }),
        'value2',
        null
      ];

      mockRedis.mget.mockResolvedValue(values);

      const result = await cacheService.mget(keys);

      expect(mockRedis.mget).toHaveBeenCalledWith(...keys);
      expect(result).toEqual([
        { data: 'value1' },
        'value2',
        null
      ]);
    });
  });

  describe('Counter Operations', () => {
    test('should increment counter', async () => {
      const key = 'counter-key';
      const newValue = 5;

      mockRedis.incr.mockResolvedValue(newValue);

      const result = await cacheService.incr(key);

      expect(mockRedis.incr).toHaveBeenCalledWith(key);
      expect(result).toBe(newValue);
    });

    test('should increment counter with TTL', async () => {
      const key = 'counter-ttl-key';
      const ttl = 300;
      const newValue = 3;

      mockPipeline.exec.mockResolvedValue([[null, newValue], [null, 'OK']]);

      const result = await cacheService.incrWithTTL(key, ttl);

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.incr).toHaveBeenCalledWith(key);
      expect(mockPipeline.expire).toHaveBeenCalledWith(key, ttl);
      expect(result).toBe(newValue);
    });

    test('should handle increment with TTL pipeline failure', async () => {
      const key = 'failed-counter';
      const ttl = 300;

      mockPipeline.exec.mockResolvedValue(null);

      const result = await cacheService.incrWithTTL(key, ttl);

      expect(result).toBe(0);
    });
  });

  describe('List Operations', () => {
    test('should push to list', async () => {
      const key = 'list-key';
      const value = { event: 'user-action', timestamp: Date.now() };

      mockRedis.lpush.mockResolvedValue(1);

      await cacheService.lpush(key, value);

      expect(mockRedis.lpush).toHaveBeenCalledWith(key, JSON.stringify(value));
    });

    test('should push string to list', async () => {
      const key = 'string-list-key';
      const value = 'simple-event';

      mockRedis.lpush.mockResolvedValue(1);

      await cacheService.lpush(key, value);

      expect(mockRedis.lpush).toHaveBeenCalledWith(key, value);
    });

    test('should get list range', async () => {
      const key = 'list-range-key';
      const listItems = [
        JSON.stringify({ id: 1 }),
        'string-item',
        JSON.stringify({ id: 2 })
      ];

      mockRedis.lrange.mockResolvedValue(listItems);

      const result = await cacheService.lrange(key, 0, -1);

      expect(mockRedis.lrange).toHaveBeenCalledWith(key, 0, -1);
      expect(result).toEqual([
        { id: 1 },
        'string-item',
        { id: 2 }
      ]);
    });
  });

  describe('Pub/Sub Operations', () => {
    test('should publish message', async () => {
      const channel = 'notifications';
      const message = { type: 'user-event', data: { userId: 123 } };

      mockRedis.publish.mockResolvedValue(1);

      await cacheService.publish(channel, message);

      expect(mockRedis.publish).toHaveBeenCalledWith(channel, JSON.stringify(message));
    });

    test('should publish string message', async () => {
      const channel = 'alerts';
      const message = 'system-alert';

      mockRedis.publish.mockResolvedValue(1);

      await cacheService.publish(channel, message);

      expect(mockRedis.publish).toHaveBeenCalledWith(channel, message);
    });
  });

  describe('Error Handling', () => {
    test('should handle Redis connection errors', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      await expect(cacheService.get('test-key')).rejects.toThrow('Redis connection failed');
    });

    test('should handle JSON parsing errors gracefully', async () => {
      const key = 'malformed-json';
      const malformedJson = '{ invalid json }';

      mockRedis.get.mockResolvedValue(malformedJson);

      const result = await cacheService.get(key);

      expect(result).toBe(malformedJson);
    });
  });
});

describe('Redis Initialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize Redis with URL', async () => {
    const config = { url: 'redis://localhost:6379' };

    mockRedis.ping.mockResolvedValue('PONG');

    const redis = await initializeRedis(config);

    expect(redis).toBeDefined();
    expect(mockRedis.ping).toHaveBeenCalled();
    expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  test('should initialize Redis with host and port', async () => {
    const config = {
      host: 'localhost',
      port: 6379,
      password: 'secret',
      db: 1
    };

    mockRedis.ping.mockResolvedValue('PONG');

    const redis = await initializeRedis(config);

    expect(redis).toBeDefined();
  });

  test('should throw error when host is missing', async () => {
    const config = { port: 6379 };

    await expect(initializeRedis(config)).rejects.toThrow(
      'Redis host must be configured'
    );
  });

  test('should throw error when port is invalid', async () => {
    const config = { host: 'localhost', port: NaN };

    await expect(initializeRedis(config)).rejects.toThrow(
      'Redis port must be configured'
    );
  });

  test('should set and expire key with TTL', async () => {
    const key = 'ttl-key';
    const value = { data: 'test-ttl' };
    const ttl = 1; // 1 second

    mockRedis.setex.mockResolvedValue('OK');
    await cacheService.set(key, value, ttl);

    // Mock time passing
    jest.advanceTimersByTime(ttl * 1000);

    mockRedis.get.mockResolvedValueOnce(null);

    const result = await cacheService.get(key);

    expect(mockRedis.get).toHaveBeenCalledWith(key);
    expect(result).toBeNull();
  });

  test('should check Redis health', async () => {
    mockRedis.ping.mockResolvedValue('PONG');

    const isHealthy = await checkRedisHealth();

    expect(isHealthy).toBe(true);
    expect(mockRedis.ping).toHaveBeenCalled();
  });

  test('should return false on health check failure', async () => {
    mockRedis.ping.mockRejectedValue(new Error('Connection failed'));

    const isHealthy = await checkRedisHealth();

    expect(isHealthy).toBe(false);
  });

  test('should close Redis connection', async () => {
    mockRedis.quit.mockResolvedValue('OK');

    await closeRedis();

    expect(mockRedis.quit).toHaveBeenCalled();
  });
});
