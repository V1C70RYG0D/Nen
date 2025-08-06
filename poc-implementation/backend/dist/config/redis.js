"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisClient = exports.getRedisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../utils/logger");
class RedisClient {
    constructor() {
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
        this.client = new ioredis_1.default(redisConfig);
        // Separate clients for pub/sub
        this.subscriber = new ioredis_1.default(redisConfig);
        this.publisher = new ioredis_1.default(redisConfig);
        this.setupEventHandlers();
    }
    static getInstance() {
        if (!RedisClient.instance) {
            RedisClient.instance = new RedisClient();
        }
        return RedisClient.instance;
    }
    setupEventHandlers() {
        // Main client event handlers
        this.client.on('connect', () => {
            logger_1.logger.info('Redis client connected');
        });
        this.client.on('ready', () => {
            logger_1.logger.info('Redis client ready');
        });
        this.client.on('error', (error) => {
            logger_1.logger.error('Redis client error:', error);
        });
        this.client.on('close', () => {
            logger_1.logger.info('Redis client connection closed');
        });
        this.client.on('reconnecting', () => {
            logger_1.logger.info('Redis client reconnecting');
        });
        // Subscriber event handlers
        this.subscriber.on('connect', () => {
            logger_1.logger.info('Redis subscriber connected');
        });
        this.subscriber.on('error', (error) => {
            logger_1.logger.error('Redis subscriber error:', error);
        });
        // Publisher event handlers
        this.publisher.on('connect', () => {
            logger_1.logger.info('Redis publisher connected');
        });
        this.publisher.on('error', (error) => {
            logger_1.logger.error('Redis publisher error:', error);
        });
    }
    getClient() {
        return this.client;
    }
    getSubscriber() {
        return this.subscriber;
    }
    getPublisher() {
        return this.publisher;
    }
    // Connection management
    async connect() {
        try {
            await Promise.all([
                this.client.connect(),
                this.subscriber.connect(),
                this.publisher.connect(),
            ]);
            logger_1.logger.info('All Redis connections established successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to connect to Redis:', error);
            throw error;
        }
    }
    async disconnect() {
        try {
            await Promise.all([
                this.client.disconnect(),
                this.subscriber.disconnect(),
                this.publisher.disconnect(),
            ]);
            logger_1.logger.info('All Redis connections closed successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to disconnect from Redis:', error);
            throw error;
        }
    }
    // Health check
    async healthCheck() {
        try {
            const result = await this.client.ping();
            return result === 'PONG';
        }
        catch (error) {
            logger_1.logger.error('Redis health check failed:', error);
            return false;
        }
    }
    // Cache operations
    async set(key, value, ttl) {
        try {
            const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
            if (ttl) {
                await this.client.setex(key, ttl, serializedValue);
            }
            else {
                await this.client.set(key, serializedValue);
            }
        }
        catch (error) {
            logger_1.logger.error(`Error setting cache key ${key}:`, error);
            throw error;
        }
    }
    async get(key) {
        try {
            const value = await this.client.get(key);
            if (value === null)
                return null;
            try {
                return JSON.parse(value);
            }
            catch {
                return value;
            }
        }
        catch (error) {
            logger_1.logger.error(`Error getting cache key ${key}:`, error);
            throw error;
        }
    }
    async del(key) {
        try {
            return await this.client.del(Array.isArray(key) ? key : [key]);
        }
        catch (error) {
            logger_1.logger.error(`Error deleting cache key(s) ${key}:`, error);
            throw error;
        }
    }
    async exists(key) {
        try {
            const result = await this.client.exists(key);
            return result === 1;
        }
        catch (error) {
            logger_1.logger.error(`Error checking cache key ${key}:`, error);
            throw error;
        }
    }
    async expire(key, ttl) {
        try {
            const result = await this.client.expire(key, ttl);
            return result === 1;
        }
        catch (error) {
            logger_1.logger.error(`Error setting expiry for key ${key}:`, error);
            throw error;
        }
    }
    // Pub/Sub operations
    async publish(channel, message) {
        try {
            const serializedMessage = typeof message === 'string' ? message : JSON.stringify(message);
            return await this.publisher.publish(channel, serializedMessage);
        }
        catch (error) {
            logger_1.logger.error(`Error publishing to channel ${channel}:`, error);
            throw error;
        }
    }
    async subscribe(channel, callback) {
        try {
            await this.subscriber.subscribe(channel);
            this.subscriber.on('message', (receivedChannel, message) => {
                if (receivedChannel === channel) {
                    try {
                        const parsedMessage = JSON.parse(message);
                        callback(parsedMessage);
                    }
                    catch {
                        callback(message);
                    }
                }
            });
        }
        catch (error) {
            logger_1.logger.error(`Error subscribing to channel ${channel}:`, error);
            throw error;
        }
    }
    async unsubscribe(channel) {
        try {
            if (channel) {
                await this.subscriber.unsubscribe(channel);
            }
            else {
                await this.subscriber.unsubscribe();
            }
        }
        catch (error) {
            logger_1.logger.error(`Error unsubscribing from channel ${channel}:`, error);
            throw error;
        }
    }
    // Hash operations
    async hset(key, field, value) {
        try {
            const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
            return await this.client.hset(key, field, serializedValue);
        }
        catch (error) {
            logger_1.logger.error(`Error setting hash field ${field} in key ${key}:`, error);
            throw error;
        }
    }
    async hget(key, field) {
        try {
            const value = await this.client.hget(key, field);
            if (value === null)
                return null;
            try {
                return JSON.parse(value);
            }
            catch {
                return value;
            }
        }
        catch (error) {
            logger_1.logger.error(`Error getting hash field ${field} from key ${key}:`, error);
            throw error;
        }
    }
    async hdel(key, ...fields) {
        try {
            return await this.client.hdel(key, ...fields);
        }
        catch (error) {
            logger_1.logger.error(`Error deleting hash fields ${fields} from key ${key}:`, error);
            throw error;
        }
    }
    // List operations
    async lpush(key, ...values) {
        try {
            const serializedValues = values.map(v => typeof v === 'string' ? v : JSON.stringify(v));
            return await this.client.lpush(key, ...serializedValues);
        }
        catch (error) {
            logger_1.logger.error(`Error pushing to list ${key}:`, error);
            throw error;
        }
    }
    async rpop(key) {
        try {
            const value = await this.client.rpop(key);
            if (value === null)
                return null;
            try {
                return JSON.parse(value);
            }
            catch {
                return value;
            }
        }
        catch (error) {
            logger_1.logger.error(`Error popping from list ${key}:`, error);
            throw error;
        }
    }
    // Set operations
    async sadd(key, ...members) {
        try {
            const serializedMembers = members.map(m => typeof m === 'string' ? m : JSON.stringify(m));
            return await this.client.sadd(key, ...serializedMembers);
        }
        catch (error) {
            logger_1.logger.error(`Error adding to set ${key}:`, error);
            throw error;
        }
    }
    async smembers(key) {
        try {
            const members = await this.client.smembers(key);
            return members.map(member => {
                try {
                    return JSON.parse(member);
                }
                catch {
                    return member;
                }
            });
        }
        catch (error) {
            logger_1.logger.error(`Error getting set members from ${key}:`, error);
            throw error;
        }
    }
}
exports.RedisClient = RedisClient;
// Export singleton instance
const getRedisClient = () => RedisClient.getInstance();
exports.getRedisClient = getRedisClient;
exports.default = RedisClient;
//# sourceMappingURL=redis.js.map