"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
exports.initializeRedis = initializeRedis;
exports.getRedis = getRedis;
exports.closeRedis = closeRedis;
exports.checkRedisHealth = checkRedisHealth;
// Redis cache initialization and management
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("./logger");
let redis = null;
async function initializeRedis(config) {
    try {
        const redisUrl = config?.url || process.env.REDIS_URL;
        if (redisUrl) {
            redis = new ioredis_1.default(redisUrl, {
                maxRetriesPerRequest: config?.maxRetriesPerRequest || 3,
                lazyConnect: config?.lazyConnect || true,
            });
        }
        else {
            // Require Redis configuration to be explicitly set
            const redisHost = config?.host || process.env.REDIS_HOST;
            const redisPort = config?.port || parseInt(process.env.REDIS_PORT || '');
            if (!redisHost) {
                throw new Error('Redis host must be configured via REDIS_HOST environment variable or config parameter');
            }
            if (!redisPort || isNaN(redisPort)) {
                throw new Error('Redis port must be configured via REDIS_PORT environment variable or config parameter');
            }
            redis = new ioredis_1.default({
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
        logger_1.logger.info('Redis connection established successfully');
        // Set up error handling
        redis.on('error', (error) => {
            logger_1.logger.error('Redis connection error:', error);
        });
        redis.on('connect', () => {
            logger_1.logger.info('Redis connected');
        });
        redis.on('disconnect', () => {
            logger_1.logger.warn('Redis disconnected');
        });
        return redis;
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize Redis:', error);
        throw error;
    }
}
function getRedis() {
    if (!redis) {
        throw new Error('Redis not initialized. Call initializeRedis() first.');
    }
    return redis;
}
async function closeRedis() {
    if (redis) {
        await redis.quit();
        redis = null;
        logger_1.logger.info('Redis connection closed');
    }
}
// Helper functions for common caching patterns
class CacheService {
    constructor() {
        this.redis = getRedis();
    }
    // Set with TTL (Time To Live)
    async set(key, value, ttlSeconds = 3600) {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        await this.redis.setex(key, ttlSeconds, serialized);
    }
    // Get and parse JSON
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
    // Delete key
    async del(key) {
        await this.redis.del(key);
    }
    // Check if key exists
    async exists(key) {
        const result = await this.redis.exists(key);
        return result === 1;
    }
    // Set multiple keys at once
    async mset(keyValuePairs, ttlSeconds = 3600) {
        const pipeline = this.redis.pipeline();
        for (const [key, value] of Object.entries(keyValuePairs)) {
            const serialized = typeof value === 'string' ? value : JSON.stringify(value);
            pipeline.setex(key, ttlSeconds, serialized);
        }
        await pipeline.exec();
    }
    // Get multiple keys at once
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
    // Increment counter
    async incr(key) {
        return await this.redis.incr(key);
    }
    // Increment counter with TTL
    async incrWithTTL(key, ttlSeconds = 3600) {
        const pipeline = this.redis.pipeline();
        pipeline.incr(key);
        pipeline.expire(key, ttlSeconds);
        const results = await pipeline.exec();
        return results?.[0]?.[1] || 0;
    }
    // List operations for real-time data
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
    // Pub/Sub for real-time notifications
    async publish(channel, message) {
        const serialized = typeof message === 'string' ? message : JSON.stringify(message);
        await this.redis.publish(channel, serialized);
    }
}
exports.CacheService = CacheService;
// Health check function
async function checkRedisHealth() {
    try {
        const redis = getRedis();
        const result = await redis.ping();
        return result === 'PONG';
    }
    catch (error) {
        logger_1.logger.error('Redis health check failed:', error);
        return false;
    }
}
//# sourceMappingURL=redis.js.map