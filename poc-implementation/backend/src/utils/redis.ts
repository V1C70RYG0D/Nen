// Redis cache initialization and management
import Redis from 'ioredis';
import { logger } from './logger';

let redis: Redis | null = null;

export interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
}

export async function initializeRedis(config?: RedisConfig): Promise<Redis> {
  try {
    const redisUrl = config?.url || process.env.REDIS_URL;

    if (redisUrl) {
      redis = new Redis(redisUrl, {
        maxRetriesPerRequest: config?.maxRetriesPerRequest || 3,
        lazyConnect: config?.lazyConnect || true,
      });
    } else {
      // Require Redis configuration to be explicitly set
      const redisHost = config?.host || process.env.REDIS_HOST;
      const redisPort = config?.port || parseInt(process.env.REDIS_PORT || '');

      if (!redisHost) {
        throw new Error('Redis host must be configured via REDIS_HOST environment variable or config parameter');
      }

      if (!redisPort || isNaN(redisPort)) {
        throw new Error('Redis port must be configured via REDIS_PORT environment variable or config parameter');
      }

      redis = new Redis({
        host: redisHost,
        port: redisPort,
        password: config?.password || process.env.REDIS_PASSWORD,
        db: config?.db || parseInt(process.env.REDIS_DB || '0'),
        maxRetriesPerRequest: config?.maxRetriesPerRequest || 3,
        lazyConnect: config?.lazyConnect || true,
      });
    }

    // Test the connection
    await redis.ping();
    logger.info('Redis connection established successfully');

    // Set up error handling
    redis.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('disconnect', () => {
      logger.warn('Redis disconnected');
    });

    return redis;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    throw error;
  }
}

export function getRedis(): Redis {
  if (!redis) {
    throw new Error('Redis not initialized. Call initializeRedis() first.');
  }
  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Redis connection closed');
  }
}

// Helper functions for common caching patterns
export class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = getRedis();
  }

  // Set with TTL (Time To Live)
  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await this.redis.setex(key, ttlSeconds, serialized);
  }

  // Get and parse JSON
  async get<T = any>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      return value as T;
    }
  }

  // Delete key
  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  // Set multiple keys at once
  async mset(keyValuePairs: Record<string, any>, ttlSeconds: number = 3600): Promise<void> {
    const pipeline = this.redis.pipeline();

    for (const [key, value] of Object.entries(keyValuePairs)) {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      pipeline.setex(key, ttlSeconds, serialized);
    }

    await pipeline.exec();
  }

  // Get multiple keys at once
  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    const values = await this.redis.mget(...keys);
    return values.map(value => {
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return value as T;
      }
    });
  }

  // Increment counter
  async incr(key: string): Promise<number> {
    return await this.redis.incr(key);
  }

  // Increment counter with TTL
  async incrWithTTL(key: string, ttlSeconds: number = 3600): Promise<number> {
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, ttlSeconds);
    const results = await pipeline.exec();
    return results?.[0]?.[1] as number || 0;
  }

  // List operations for real-time data
  async lpush(key: string, value: any): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await this.redis.lpush(key, serialized);
  }

  async lrange<T = any>(key: string, start: number = 0, stop: number = -1): Promise<T[]> {
    const values = await this.redis.lrange(key, start, stop);
    return values.map(value => {
      try {
        return JSON.parse(value);
      } catch {
        return value as T;
      }
    });
  }

  // Pub/Sub for real-time notifications
  async publish(channel: string, message: any): Promise<void> {
    const serialized = typeof message === 'string' ? message : JSON.stringify(message);
    await this.redis.publish(channel, serialized);
  }
}

// Health check function
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const redis = getRedis();
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return false;
  }
}
