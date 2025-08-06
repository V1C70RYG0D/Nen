"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisPool = exports.RedisConnection = void 0;
exports.initializeRedis = initializeRedis;
exports.getRedis = getRedis;
exports.closeRedis = closeRedis;
// Redis connection wrapper for production use - GI-02 Compliant: Real Implementation
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("./logger");
class RedisConnection {
    constructor(config) {
        this.isConnected = false;
        const redisUrl = process.env.REDIS_URL || process.env.DEFAULT_REDIS_URL;
        if (!redisUrl) {
            throw new Error('REDIS_URL or DEFAULT_REDIS_URL environment variable is required');
        }
        if (typeof config === 'string') {
            this.client = new ioredis_1.default(config);
        }
        else {
            const host = process.env.REDIS_HOST || process.env.DEFAULT_REDIS_HOST;
            const port = process.env.REDIS_PORT || process.env.DEFAULT_REDIS_PORT;
            if (!host || !port) {
                throw new Error('REDIS_HOST and REDIS_PORT environment variables are required');
            }
            this.client = new ioredis_1.default({
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
    async mget(keys) {
        return await this.client.mget(...keys);
    }
    async incr(key) {
        return await this.client.incr(key);
    }
    async lpush(key, ...values) {
        return await this.client.lpush(key, ...values);
    }
    async lrange(key, start, stop) {
        return await this.client.lrange(key, start, stop);
    }
    async expire(key, seconds) {
        return await this.client.expire(key, seconds);
    }
    async ttl(key) {
        return await this.client.ttl(key);
    }
    async hset(key, field, value) {
        return await this.client.hset(key, field, value);
    }
    async hget(key, field) {
        return await this.client.hget(key, field);
    }
    async hgetall(key) {
        return await this.client.hgetall(key);
    }
    async publish(channel, message) {
        return await this.client.publish(channel, message);
    }
    pipeline() {
        return this.client.pipeline();
    }
    async quit() {
        return await this.client.quit();
    }
    async disconnect() {
        this.client.disconnect();
        this.isConnected = false;
    }
    get connected() {
        return this.isConnected;
    }
}
exports.RedisConnection = RedisConnection;
let redisConnection = null;
async function initializeRedis(config) {
    try {
        if (!redisConnection) {
            redisConnection = new RedisConnection(config);
            await redisConnection.ping(); // Test connection
            logger_1.logger.info('Redis connection initialized successfully');
        }
        return redisConnection;
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize Redis connection:', error);
        throw new Error(`Redis initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
function getRedis() {
    if (!redisConnection) {
        throw new Error('Redis connection not initialized. Call initializeRedis() first.');
    }
    return redisConnection;
}
async function closeRedis() {
    try {
        if (redisConnection) {
            await redisConnection.quit();
            redisConnection = null;
            logger_1.logger.info('Redis connection closed successfully');
        }
    }
    catch (error) {
        logger_1.logger.error('Error closing Redis connection:', error);
        throw error;
    }
}
class RedisPool {
    constructor(maxConnections = parseInt(process.env.REDIS_POOL_SIZE || '10')) {
        this.connections = [];
        this.currentIndex = 0;
        this.maxConnections = maxConnections;
    }
    async initialize(config) {
        try {
            for (let i = 0; i < this.maxConnections; i++) {
                const connection = new RedisConnection(config);
                await connection.ping(); // Verify connection
                this.connections.push(connection);
            }
            logger_1.logger.info(`Redis pool initialized with ${this.maxConnections} connections`);
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Redis pool:', error);
            throw error;
        }
    }
    getConnection() {
        if (this.connections.length === 0) {
            throw new Error('Redis pool not initialized');
        }
        const connection = this.connections[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.connections.length;
        return connection;
    }
    async close() {
        try {
            await Promise.all(this.connections.map(conn => conn.quit()));
            this.connections = [];
            logger_1.logger.info('Redis pool closed successfully');
        }
        catch (error) {
            logger_1.logger.error('Error closing Redis pool:', error);
            throw error;
        }
    }
}
exports.RedisPool = RedisPool;
exports.default = RedisConnection;
//# sourceMappingURL=redisConnection.js.map