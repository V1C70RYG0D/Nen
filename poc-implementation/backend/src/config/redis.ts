import Redis from 'ioredis';
import { logger } from '../utils/logger';

class RedisClient {
  private static instance: RedisClient;
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;

  private constructor() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      retryDelayOnClusterDown: 300,
      enableOfflineQueue: false,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
    };

    // Main Redis client
    this.client = new Redis(redisConfig);

    // Separate clients for pub/sub
    this.subscriber = new Redis(redisConfig);
    this.publisher = new Redis(redisConfig);

    this.setupEventHandlers();
  }

  static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  private setupEventHandlers(): void {
    // Main client event handlers
    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error:', error);
    });

    this.client.on('close', () => {
      logger.info('Redis client connection closed');
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });

    // Subscriber event handlers
    this.subscriber.on('connect', () => {
      logger.info('Redis subscriber connected');
    });

    this.subscriber.on('error', (error) => {
      logger.error('Redis subscriber error:', error);
    });

    // Publisher event handlers
    this.publisher.on('connect', () => {
      logger.info('Redis publisher connected');
    });

    this.publisher.on('error', (error) => {
      logger.error('Redis publisher error:', error);
    });
  }

  getClient(): Redis {
    return this.client;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }

  getPublisher(): Redis {
    return this.publisher;
  }

  // Connection management
  async connect(): Promise<void> {
    try {
      await Promise.all([
        this.client.connect(),
        this.subscriber.connect(),
        this.publisher.connect(),
      ]);
      logger.info('All Redis connections established successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await Promise.all([
        this.client.disconnect(),
        this.subscriber.disconnect(),
        this.publisher.disconnect(),
      ]);
      logger.info('All Redis connections closed successfully');
    } catch (error) {
      logger.error('Failed to disconnect from Redis:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  // Cache operations
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      logger.error(`Error setting cache key ${key}:`, error);
      throw error;
    }
  }

  async get(key: string): Promise<any> {
    try {
      const value = await this.client.get(key);
      if (value === null) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error(`Error getting cache key ${key}:`, error);
      throw error;
    }
  }

  async del(key: string | string[]): Promise<number> {
    try {
      return await this.client.del(Array.isArray(key) ? key : [key]);
    } catch (error) {
      logger.error(`Error deleting cache key(s) ${key}:`, error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Error checking cache key ${key}:`, error);
      throw error;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, ttl);
      return result === 1;
    } catch (error) {
      logger.error(`Error setting expiry for key ${key}:`, error);
      throw error;
    }
  }

  // Pub/Sub operations
  async publish(channel: string, message: any): Promise<number> {
    try {
      const serializedMessage = typeof message === 'string' ? message : JSON.stringify(message);
      return await this.publisher.publish(channel, serializedMessage);
    } catch (error) {
      logger.error(`Error publishing to channel ${channel}:`, error);
      throw error;
    }
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    try {
      await this.subscriber.subscribe(channel);
      this.subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const parsedMessage = JSON.parse(message);
            callback(parsedMessage);
          } catch {
            callback(message);
          }
        }
      });
    } catch (error) {
      logger.error(`Error subscribing to channel ${channel}:`, error);
      throw error;
    }
  }

  async unsubscribe(channel?: string): Promise<void> {
    try {
      if (channel) {
        await this.subscriber.unsubscribe(channel);
      } else {
        await this.subscriber.unsubscribe();
      }
    } catch (error) {
      logger.error(`Error unsubscribing from channel ${channel}:`, error);
      throw error;
    }
  }

  // Hash operations
  async hset(key: string, field: string, value: any): Promise<number> {
    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      return await this.client.hset(key, field, serializedValue);
    } catch (error) {
      logger.error(`Error setting hash field ${field} in key ${key}:`, error);
      throw error;
    }
  }

  async hget(key: string, field: string): Promise<any> {
    try {
      const value = await this.client.hget(key, field);
      if (value === null) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error(`Error getting hash field ${field} from key ${key}:`, error);
      throw error;
    }
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    try {
      return await this.client.hdel(key, ...fields);
    } catch (error) {
      logger.error(`Error deleting hash fields ${fields} from key ${key}:`, error);
      throw error;
    }
  }

  // List operations
  async lpush(key: string, ...values: any[]): Promise<number> {
    try {
      const serializedValues = values.map(v => typeof v === 'string' ? v : JSON.stringify(v));
      return await this.client.lpush(key, ...serializedValues);
    } catch (error) {
      logger.error(`Error pushing to list ${key}:`, error);
      throw error;
    }
  }

  async rpop(key: string): Promise<any> {
    try {
      const value = await this.client.rpop(key);
      if (value === null) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error(`Error popping from list ${key}:`, error);
      throw error;
    }
  }

  // Set operations
  async sadd(key: string, ...members: any[]): Promise<number> {
    try {
      const serializedMembers = members.map(m => typeof m === 'string' ? m : JSON.stringify(m));
      return await this.client.sadd(key, ...serializedMembers);
    } catch (error) {
      logger.error(`Error adding to set ${key}:`, error);
      throw error;
    }
  }

  async smembers(key: string): Promise<any[]> {
    try {
      const members = await this.client.smembers(key);
      return members.map(member => {
        try {
          return JSON.parse(member);
        } catch {
          return member;
        }
      });
    } catch (error) {
      logger.error(`Error getting set members from ${key}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const getRedisClient = (): RedisClient => RedisClient.getInstance();

// Export for backward compatibility
export { RedisClient };
export default RedisClient;
