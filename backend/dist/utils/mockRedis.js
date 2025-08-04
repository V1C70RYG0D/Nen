"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockCacheService = void 0;
exports.initializeMockRedis = initializeMockRedis;
exports.getMockRedis = getMockRedis;
exports.closeMockRedis = closeMockRedis;
exports.checkMockRedisHealth = checkMockRedisHealth;
const logger_1 = require("./logger");
class MockRedis {
    data = new Map();
    isConnected = false;
    constructor(config) {
        this.isConnected = true;
    }
    async ping() {
        return 'PONG';
    }
    async get(key) {
        return this.data.get(key) || null;
    }
    async set(key, value) {
        this.data.set(key, value);
        return 'OK';
    }
    async setex(key, seconds, value) {
        this.data.set(key, value);
        return 'OK';
    }
    async del(key) {
        const existed = this.data.has(key);
        this.data.delete(key);
        return existed ? 1 : 0;
    }
    async exists(key) {
        return this.data.has(key) ? 1 : 0;
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
        logger_1.logger.debug(`Mock Redis publish to ${channel}: ${message}`);
        return 1;
    }
    pipeline() {
        return new MockPipeline(this);
    }
    on(event, callback) {
        if (event === 'connect') {
            setTimeout(() => callback(), 0);
        }
    }
    async quit() {
        this.isConnected = false;
        return 'OK';
    }
}
class MockPipeline {
    redis;
    commands = [];
    constructor(redis) {
        this.redis = redis;
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
class MockCacheService {
    redis;
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