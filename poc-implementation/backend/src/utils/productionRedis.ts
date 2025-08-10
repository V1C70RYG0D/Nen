// Redis connection wrapper for production use
import Redis from 'ioredis';
import { logger } from './logger';

export interface RedisConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
}

// Production Redis implementation using ioredis
export class RedisConnection {
  private client: Redis;
  private isConnected: boolean = false;

  constructor(config?: string | RedisConfig) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is required');
    }

    if (typeof config === 'string') {
      this.client = new Redis(config);
    } else {
      const host = process.env.REDIS_HOST;
      const port = process.env.REDIS_PORT;

      if (!host || !port) {
        throw new Error('REDIS_HOST and REDIS_PORT environment variables are required');
      }

      this.client = new Redis({
        host,
        port: parseInt(port),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        ...config
      });
    }

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis connected successfully');
    });

    this.client.on('error', (error) => {
      this.isConnected = false;
      logger.error('Redis connection error:', error);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis connection closed');
    });
  }

  async ping(): Promise<string> {
    return await this.client.ping();
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async set(key: string, value: string): Promise<'OK'> {
    return await this.client.set(key, value);
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    return await this.client.setex(key, seconds, value);
  }

  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    return await this.client.exists(key);
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    return keys.map(key => this.data.get(key) || null);
  }

  async incr(key: string): Promise<number> {
    const current = parseInt(this.data.get(key) || '0');
    const newValue = current + 1;
    this.data.set(key, newValue.toString());
    return newValue;
  }

  async expire(key: string, seconds: number): Promise<number> {
    // Mock implementation - just return success
    return this.data.has(key) ? 1 : 0;
  }

  async lpush(key: string, value: string): Promise<number> {
    const existing = this.data.get(key) || '[]';
    const array = JSON.parse(existing);
    array.unshift(value);
    this.data.set(key, JSON.stringify(array));
    return array.length;
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const existing = this.data.get(key) || '[]';
    const array = JSON.parse(existing);
    if (stop === -1) stop = array.length - 1;
    return array.slice(start, stop + 1);
  }

  async publish(channel: string, message: string): Promise<number> {
    // Mock publish - just log it
    logger.debug(`Mock Redis publish to ${channel}: ${message}`);
    return 1;
  }

  pipeline() {
    return new MockPipeline(this);
  }

  on(event: string, callback: Function) {
    // Mock event handling
    if (event === 'connect') {
      setTimeout(() => callback(), 0);
    }
  }

  async quit(): Promise<'OK'> {
    this.isConnected = false;
    return 'OK';
  }
}

class MockPipeline {
  private commands: Array<() => Promise<any>> = [];

  constructor(private redis: MockRedis) {}

  incr(key: string) {
    this.commands.push(() => this.redis.incr(key));
    return this;
  }

  expire(key: string, seconds: number) {
    this.commands.push(() => this.redis.expire(key, seconds));
    return this;
  }

  setex(key: string, seconds: number, value: string) {
    this.commands.push(() => this.redis.setex(key, seconds, value));
    return this;
  }

  async exec(): Promise<[null, any][]> {
    const results: [null, any][] = [];
    for (const command of this.commands) {
      try {
        const result = await command();
        results.push([null, result]);
      } catch (error) {
        results.push([error, null]);
      }
    }
    return results;
  }
}

let mockRedis: MockRedis | null = null;

export async function initializeMockRedis(config?: MockRedisConfig): Promise<MockRedis> {
  try {
    mockRedis = new MockRedis(config);
    await mockRedis.ping();
    logger.info('Mock Redis connection established successfully');
    return mockRedis;
  } catch (error) {
    logger.error('Failed to initialize Mock Redis:', error);
    throw error;
  }
}

export function getMockRedis(): MockRedis {
  if (!mockRedis) {
    throw new Error('Mock Redis not initialized. Call initializeMockRedis() first.');
  }
  return mockRedis;
}

export async function closeMockRedis(): Promise<void> {
  if (mockRedis) {
    await mockRedis.quit();
    mockRedis = null;
    logger.info('Mock Redis connection closed');
  }
}

// Mock Cache Service that uses MockRedis
export class MockCacheService {
  private redis: MockRedis;

  constructor() {
    this.redis = getMockRedis();
  }

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await this.redis.setex(key, ttlSeconds, serialized);
  }

  async get<T = any>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      return value as T;
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async mset(keyValuePairs: Record<string, any>, ttlSeconds: number = 3600): Promise<void> {
    const pipeline = this.redis.pipeline();

    for (const [key, value] of Object.entries(keyValuePairs)) {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      pipeline.setex(key, ttlSeconds, serialized);
    }

    await pipeline.exec();
  }

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

  async incr(key: string): Promise<number> {
    return await this.redis.incr(key);
  }

  async incrWithTTL(key: string, ttlSeconds: number = 3600): Promise<number> {
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, ttlSeconds);
    const results = await pipeline.exec();
    return results?.[0]?.[1] as number || 0;
  }

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

  async publish(channel: string, message: any): Promise<void> {
    const serialized = typeof message === 'string' ? message : JSON.stringify(message);
    await this.redis.publish(channel, serialized);
  }
}

export async function checkMockRedisHealth(): Promise<boolean> {
  try {
    const redis = getMockRedis();
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Mock Redis health check failed:', error);
    return false;
  }
}
