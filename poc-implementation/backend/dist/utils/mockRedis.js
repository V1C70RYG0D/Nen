"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockCacheService = exports.RedisConnection = void 0;
exports.initializeMockRedis = initializeMockRedis;
exports.getMockRedis = getMockRedis;
exports.closeMockRedis = closeMockRedis;
exports.checkMockRedisHealth = checkMockRedisHealth;
// Redis connection wrapper for production use
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("./logger");
// Production Redis implementation using ioredis
class RedisConnection {
    constructor(config) {
        this.isConnected = false;
        const redisUrl = process.env.REDIS_URL || process.env.DEFAULT_REDIS_URL;
        if (!redisUrl) {
        }
        if (typeof config === 'string') {
            this.client = new ioredis_1.default(config);
        }
        else {
            const host = process.env.REDIS_HOST || process.env.DEFAULT_REDIS_HOST;
            const port = process.env.REDIS_PORT || process.env.DEFAULT_REDIS_PORT;
            const db = process.env.REDIS_DB || process.env.DEFAULT_REDIS_DB;
            if (!host || !port || !db) {
            }
            this.client = new ioredis_1.default({
                host,
                port: parseInt(port),
                password: process.env.REDIS_PASSWORD,
                db: parseInt(db),
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 3,
                lazyConnect: true,
                ...config
            });
        }
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.client.on('connect', () => {
            this.isConnected = true;
            logger_1.logger.info('Redis connected successfully');
        });
        this.client.on('error', (error) => {
            this.isConnected = false;
            logger_1.logger.error('Redis connection error:', error);
        });
        this.client.on('close', () => {
            this.isConnected = false;
            logger_1.logger.warn('Redis connection closed');
        });
    }
    async ping() {
        return await this.client.ping();
    }
    async get(key) {
        return await this.client.get(key);
    }
    async set(key, value) {
        return await this.client.set(key, value);
    }
    async setex(key, seconds, value) {
        return await this.client.setex(key, seconds, value);
    }
    async del(key) {
        return await this.client.del(key);
    }
    async exists(key) {
        return await this.client.exists(key);
    }
    async mget(...keys) {
        return keys.map(key => this.data.get(key) || null);
    }
    async incr(key) {
        const current = parseInt(this.data.get(key) || '0');
        const newValue = current + 1;
        this.data.set(key, newValue.toString());
        return newValue;
    }
    async expire(key, seconds) {
        // Mock implementation - just return success
        return this.data.has(key) ? 1 : 0;
    }
    async lpush(key, value) {
        const existing = this.data.get(key) || '[]';
        const array = JSON.parse(existing);
        array.unshift(value);
        this.data.set(key, JSON.stringify(array));
        return array.length;
    }
    async lrange(key, start, stop) {
        const existing = this.data.get(key) || '[]';
        const array = JSON.parse(existing);
        if (stop === -1)
            stop = array.length - 1;
        return array.slice(start, stop + 1);
    }
    async publish(channel, message) {
        // Mock publish - just log it
        logger_1.logger.debug(`Mock Redis publish to ${channel}: ${message}`);
        return 1;
    }
    pipeline() {
        return new MockPipeline(this);
    }
    on(event, callback) {
        // Mock event handling
        if (event === 'connect') {
            setTimeout(() => callback(), parseInt(process.env.REDIS_MOCK_CALLBACK_DELAY || process.env.DEFAULT_REDIS_MOCK_CALLBACK_DELAY || (() => {
            })()));
        }
    }
    async quit() {
        this.isConnected = false;
        return 'OK';
    }
}
exports.RedisConnection = RedisConnection;
class MockPipeline {
    constructor(redis) {
        this.redis = redis;
        this.commands = [];
    }
    incr(key) {
        this.commands.push(() => this.redis.incr(key));
        return this;
    }
    expire(key, seconds) {
        this.commands.push(() => this.redis.expire(key, seconds));
        return this;
    }
    setex(key, seconds, value) {
        this.commands.push(() => this.redis.setex(key, seconds, value));
        return this;
    }
    async exec() {
        const results = [];
        for (const command of this.commands) {
            try {
                const result = await command();
                results.push([null, result]);
            }
            catch (error) {
                results.push([error, null]);
            }
        }
        return results;
    }
}
let mockRedis = null;
async function initializeMockRedis(config) {
    try {
        mockRedis = new MockRedis(config);
        await mockRedis.ping();
        logger_1.logger.info('Mock Redis connection established successfully');
        return mockRedis;
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize Mock Redis:', error);
        throw error;
    }
}
function getMockRedis() {
    if (!mockRedis) {
        throw new Error('Mock Redis not initialized. Call initializeMockRedis() first.');
    }
    return mockRedis;
}
async function closeMockRedis() {
    if (mockRedis) {
        await mockRedis.quit();
        mockRedis = null;
        logger_1.logger.info('Mock Redis connection closed');
    }
}
// Mock Cache Service that uses MockRedis
class MockCacheService {
    constructor() {
        this.redis = getMockRedis();
    }
    async set(key, value, ttlSeconds = 3600) {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        await this.redis.setex(key, ttlSeconds, serialized);
    }
    async get(key) {
        const value = await this.redis.get(key);
        if (!value)
            return null;
        try {
            return JSON.parse(value);
        }
        catch {
            return value;
        }
    }
    async del(key) {
        await this.redis.del(key);
    }
    async exists(key) {
        const result = await this.redis.exists(key);
        return result === 1;
    }
    async mset(keyValuePairs, ttlSeconds = 3600) {
        const pipeline = this.redis.pipeline();
        for (const [key, value] of Object.entries(keyValuePairs)) {
            const serialized = typeof value === 'string' ? value : JSON.stringify(value);
            pipeline.setex(key, ttlSeconds, serialized);
        }
        await pipeline.exec();
    }
    async mget(keys) {
        const values = await this.redis.mget(...keys);
        return values.map(value => {
            if (!value)
                return null;
            try {
                return JSON.parse(value);
            }
            catch {
                return value;
            }
        });
    }
    async incr(key) {
        return await this.redis.incr(key);
    }
    async incrWithTTL(key, ttlSeconds = 3600) {
        const pipeline = this.redis.pipeline();
        pipeline.incr(key);
        pipeline.expire(key, ttlSeconds);
        const results = await pipeline.exec();
        return results?.[0]?.[1] || 0;
    }
    async lpush(key, value) {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        await this.redis.lpush(key, serialized);
    }
    async lrange(key, start = 0, stop = -1) {
        const values = await this.redis.lrange(key, start, stop);
        return values.map(value => {
            try {
                return JSON.parse(value);
            }
            catch {
                return value;
            }
        });
    }
    async publish(channel, message) {
        const serialized = typeof message === 'string' ? message : JSON.stringify(message);
        await this.redis.publish(channel, serialized);
    }
}
exports.MockCacheService = MockCacheService;
async function checkMockRedisHealth() {
    try {
        const redis = getMockRedis();
        const result = await redis.ping();
        return result === 'PONG';
    }
    catch (error) {
        logger_1.logger.error('Mock Redis health check failed:', error);
        return false;
    }
}
//# sourceMappingURL=mockRedis.js.map