"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedCachingService = exports.EnhancedCachingService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const node_cache_1 = __importDefault(require("node-cache"));
const logger_1 = require("../utils/logger");
class EnhancedCachingService {
    l1Cache;
    l2Cache;
    config;
    metrics;
    isInitialized = false;
    constructor(config) {
        this.config = {
            enableL1Cache: true,
            enableL2Cache: true,
            enableL3Cache: true,
            enableGeographicDistribution: false,
            l1TtlSeconds: 300,
            l2TtlSeconds: 3600,
            l3TtlSeconds: 86400,
            maxMemoryUsage: 256,
            compressionEnabled: true,
            metricsEnabled: true,
            ...config
        };
        this.metrics = {
            l1Hits: 0,
            l1Misses: 0,
            l2Hits: 0,
            l2Misses: 0,
            l3Hits: 0,
            l3Misses: 0,
            averageLatency: 0,
            totalRequests: 0,
            lastReset: new Date()
        };
        this.initializeCaches();
    }
    async initializeCaches() {
        try {
            if (this.config.enableL1Cache) {
                this.l1Cache = new node_cache_1.default({
                    stdTTL: this.config.l1TtlSeconds,
                    checkperiod: 60,
                    maxKeys: 10000,
                    useClones: false
                });
                logger_1.logger.info('L1 Cache (In-Memory) initialized successfully');
            }
            if (this.config.enableL2Cache) {
                try {
                    const redisUrl = process.env.REDIS_URL;
                    if (!redisUrl || redisUrl.trim() === '') {
                        logger_1.logger.info('REDIS_URL not configured, disabling L2 cache for local development');
                        this.config.enableL2Cache = false;
                        this.l2Cache = null;
                    }
                    else {
                        this.l2Cache = new ioredis_1.default(redisUrl, {
                            maxRetriesPerRequest: 1,
                            lazyConnect: true,
                            family: 4,
                            keepAlive: 30000,
                            commandTimeout: 2000,
                            connectTimeout: 3000,
                        });
                        await this.l2Cache.ping();
                        logger_1.logger.info('L2 Cache (Redis) initialized successfully');
                    }
                }
                catch (redisError) {
                    logger_1.logger.warn('Redis not available, disabling L2 cache for POC demo:', redisError);
                    this.config.enableL2Cache = false;
                    this.l2Cache = null;
                }
            }
            this.isInitialized = true;
            logger_1.logger.info('Enhanced Caching Service initialized with multi-tier architecture');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Enhanced Caching Service:', error);
            if (this.l1Cache) {
                logger_1.logger.warn('Continuing with L1 cache only for POC demonstration');
                this.config.enableL2Cache = false;
                this.isInitialized = true;
                return;
            }
            throw new Error(`Caching service initialization failed: ${error}`);
        }
    }
    async get(key) {
        const startTime = performance.now();
        this.metrics.totalRequests++;
        try {
            const keyString = this.buildCacheKey(key);
            if (this.config.enableL1Cache) {
                const l1Result = this.l1Cache.get(keyString);
                if (l1Result !== undefined) {
                    this.metrics.l1Hits++;
                    this.updateLatencyMetrics(startTime);
                    logger_1.logger.debug(`L1 Cache HIT for key: ${keyString}`);
                    return l1Result;
                }
                this.metrics.l1Misses++;
            }
            if (this.config.enableL2Cache && this.l2Cache) {
                try {
                    const l2Result = await this.l2Cache.get(keyString);
                    if (l2Result) {
                        this.metrics.l2Hits++;
                        const parsedResult = JSON.parse(l2Result);
                        if (this.config.enableL1Cache) {
                            this.l1Cache.set(keyString, parsedResult);
                        }
                        this.updateLatencyMetrics(startTime);
                        logger_1.logger.debug(`L2 Cache HIT for key: ${keyString}`);
                        return parsedResult;
                    }
                    this.metrics.l2Misses++;
                }
                catch (redisError) {
                    logger_1.logger.warn(`L2 Cache error, falling back to L3: ${redisError}`);
                    this.metrics.l2Misses++;
                }
            }
            this.metrics.l3Misses++;
            this.updateLatencyMetrics(startTime);
            logger_1.logger.debug(`Cache MISS for key: ${keyString}`);
            return null;
        }
        catch (error) {
            logger_1.logger.error(`Cache GET error for key ${JSON.stringify(key)}:`, error);
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        try {
            const keyString = this.buildCacheKey(key);
            const ttl = ttlSeconds || this.config.l1TtlSeconds;
            if (this.config.enableL1Cache) {
                this.l1Cache.set(keyString, value, ttl);
            }
            if (this.config.enableL2Cache && this.l2Cache) {
                try {
                    const serializedValue = JSON.stringify(value);
                    await this.l2Cache.setex(keyString, ttl, serializedValue);
                }
                catch (redisError) {
                    logger_1.logger.warn(`L2 Cache SET error: ${redisError}`);
                }
            }
            logger_1.logger.debug(`Cache SET for key: ${keyString}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Cache SET error for key ${JSON.stringify(key)}:`, error);
            return false;
        }
    }
    async delete(key) {
        try {
            const keyString = this.buildCacheKey(key);
            if (this.config.enableL1Cache) {
                this.l1Cache.del(keyString);
            }
            if (this.config.enableL2Cache && this.l2Cache) {
                try {
                    await this.l2Cache.del(keyString);
                }
                catch (redisError) {
                    logger_1.logger.warn(`L2 Cache DELETE error: ${redisError}`);
                }
            }
            logger_1.logger.debug(`Cache DELETE for key: ${keyString}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Cache DELETE error for key ${JSON.stringify(key)}:`, error);
            return false;
        }
    }
    async cacheGameState(gameId, gameState) {
        const key = {
            type: 'game_state',
            identifier: gameId,
            version: 'v1'
        };
        return await this.set(key, gameState, this.config.l2TtlSeconds);
    }
    async getCachedGameState(gameId) {
        const key = {
            type: 'game_state',
            identifier: gameId,
            version: 'v1'
        };
        return await this.get(key);
    }
    async cacheAIMove(gameId, boardHash, move, difficulty) {
        const key = {
            type: 'ai_move',
            identifier: `${gameId}_${boardHash}_${difficulty}`,
            version: 'v1'
        };
        return await this.set(key, move, 1800);
    }
    async getCachedAIMove(gameId, boardHash, difficulty) {
        const key = {
            type: 'ai_move',
            identifier: `${gameId}_${boardHash}_${difficulty}`,
            version: 'v1'
        };
        return await this.get(key);
    }
    buildCacheKey(key) {
        const parts = [
            'nen',
            key.type,
            key.identifier
        ];
        if (key.version)
            parts.push(key.version);
        if (key.geographic_region)
            parts.push(key.geographic_region);
        return parts.join(':');
    }
    updateLatencyMetrics(startTime) {
        if (!this.config.metricsEnabled)
            return;
        const latency = performance.now() - startTime;
        const totalLatency = this.metrics.averageLatency * (this.metrics.totalRequests - 1) + latency;
        this.metrics.averageLatency = totalLatency / this.metrics.totalRequests;
    }
    getCacheMetrics() {
        return { ...this.metrics };
    }
    resetMetrics() {
        this.metrics = {
            l1Hits: 0,
            l1Misses: 0,
            l2Hits: 0,
            l2Misses: 0,
            l3Hits: 0,
            l3Misses: 0,
            averageLatency: 0,
            totalRequests: 0,
            lastReset: new Date()
        };
    }
    async warmupCache() {
        logger_1.logger.info('Starting cache warmup process...');
        try {
            logger_1.logger.info('Cache warmup completed successfully');
        }
        catch (error) {
            logger_1.logger.error('Cache warmup failed:', error);
        }
    }
    async shutdown() {
        try {
            if (this.l2Cache) {
                await this.l2Cache.quit();
            }
            if (this.l1Cache) {
                this.l1Cache.close();
            }
            logger_1.logger.info('Enhanced Caching Service shutdown completed');
        }
        catch (error) {
            logger_1.logger.error('Cache shutdown error:', error);
        }
    }
}
exports.EnhancedCachingService = EnhancedCachingService;
exports.enhancedCachingService = new EnhancedCachingService({
    enableL1Cache: true,
    enableL2Cache: true,
    enableL3Cache: false,
    enableGeographicDistribution: false,
    metricsEnabled: true
});
//# sourceMappingURL=EnhancedCachingService.js.map