// Redis connection wrapper for production use - GI-02 Compliant: Real Implementation
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


export class RedisConnection {
  private client: Redis;
  private isConnected: boolean = false;

  constructor(config?: string | RedisConfig) {
    const redisUrl = process.env.REDIS_URL || process.env.DEFAULT_REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL or DEFAULT_REDIS_URL environment variable is required');
    }

    if (typeof config === 'string') {
      this.client = new Redis(config);
    } else {
      const host = process.env.REDIS_HOST || process.env.DEFAULT_REDIS_HOST;
      const port = process.env.REDIS_PORT || process.env.DEFAULT_REDIS_PORT;

      if (!host || !port) {
        throw new Error('REDIS_HOST and REDIS_PORT environment variables are required');
      }

      this.client = new Redis({
        host,
        port: parseInt(port),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100'),
        maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
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

  async mget(keys: string[]): Promise<(string | null)[]> {
    return await this.client.mget(...keys);
  }

  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    return await this.client.lpush(key, ...values);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.client.lrange(key, start, stop);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return await this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return await this.client.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return await this.client.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.client.hgetall(key);
  }

  async publish(channel: string, message: string): Promise<number> {
    return await this.client.publish(channel, message);
  }

  pipeline() {
    return this.client.pipeline();
  }

  async quit(): Promise<'OK'> {
    return await this.client.quit();
  }

  async disconnect(): Promise<void> {
    this.client.disconnect();
    this.isConnected = false;
  }

  get connected(): boolean {
    return this.isConnected;
  }
}


let redisConnection: RedisConnection | null = null;

export async function initializeRedis(config?: RedisConfig): Promise<RedisConnection> {
  try {
    if (!redisConnection) {
      redisConnection = new RedisConnection(config);
      await redisConnection.ping(); // Test connection
      logger.info('Redis connection initialized successfully');
    }
    return redisConnection;
  } catch (error) {
    logger.error('Failed to initialize Redis connection:', error);
    throw new Error(`Redis initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function getRedis(): RedisConnection {
  if (!redisConnection) {
    throw new Error('Redis connection not initialized. Call initializeRedis() first.');
  }
  return redisConnection;
}

export async function closeRedis(): Promise<void> {
  try {
    if (redisConnection) {
      await redisConnection.quit();
      redisConnection = null;
      logger.info('Redis connection closed successfully');
    }
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
    throw error;
  }
}


export class RedisPool {
  private connections: RedisConnection[] = [];
  private maxConnections: number;
  private currentIndex: number = 0;

  constructor(maxConnections: number = parseInt(process.env.REDIS_POOL_SIZE || '10')) {
    this.maxConnections = maxConnections;
  }

  async initialize(config?: RedisConfig): Promise<void> {
    try {
      for (let i = 0; i < this.maxConnections; i++) {
        const connection = new RedisConnection(config);
        await connection.ping(); // Verify connection
        this.connections.push(connection);
      }
      logger.info(`Redis pool initialized with ${this.maxConnections} connections`);
    } catch (error) {
      logger.error('Failed to initialize Redis pool:', error);
      throw error;
    }
  }

  getConnection(): RedisConnection {
    if (this.connections.length === 0) {
      throw new Error('Redis pool not initialized');
    }

    const connection = this.connections[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.connections.length;
    return connection;
  }

  async close(): Promise<void> {
    try {
      await Promise.all(this.connections.map(conn => conn.quit()));
      this.connections = [];
      logger.info('Redis pool closed successfully');
    } catch (error) {
      logger.error('Error closing Redis pool:', error);
      throw error;
    }
  }
}

export default RedisConnection;
