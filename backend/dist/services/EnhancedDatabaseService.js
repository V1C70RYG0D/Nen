"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedDatabaseService = exports.getEnhancedDatabaseService = void 0;
const client_1 = require("@prisma/client");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../middleware/logger");
class EnhancedDatabaseService {
    prisma;
    redis;
    metrics = {
        totalQueries: 0,
        averageQueryTime: 0,
        slowQueries: 0,
        fastQueries: 0,
        cacheHits: 0,
        cacheMisses: 0
    };
    health = {
        isConnected: false,
        lastChecked: new Date(),
        averageResponseTime: 0,
        connectionPoolSize: 0,
        activeConnections: 0
    };
    constructor() {
        this.prisma = new client_1.PrismaClient({
            log: [
                { emit: 'event', level: 'query' },
                { emit: 'event', level: 'error' },
                { emit: 'event', level: 'warn' }
            ],
            datasources: {
                db: {
                    url: process.env.DATABASE_URL
                }
            }
        });
        const redisUrl = process.env.REDIS_URL;
        if (redisUrl && redisUrl.trim() !== '') {
            this.redis = new ioredis_1.default(redisUrl, {
                maxRetriesPerRequest: 1,
                lazyConnect: true,
                keepAlive: 30000,
                commandTimeout: 5000
            });
        }
        else {
            this.redis = null;
            logger_1.logger.info('Redis not configured, database service running without cache');
        }
        this.setupQueryLogging();
        this.setupHealthMonitoring();
    }
    setupQueryLogging() {
        this.prisma.$on('query', (e) => {
            const queryTime = e.duration;
            this.metrics.totalQueries++;
            if (queryTime > 10) {
                this.metrics.slowQueries++;
                logger_1.logger.warn('Slow database query detected', {
                    query: e.query,
                    duration: `${queryTime}ms`,
                    target: '10ms',
                    params: e.params
                });
            }
            else {
                this.metrics.fastQueries++;
            }
            this.metrics.averageQueryTime =
                (this.metrics.averageQueryTime * (this.metrics.totalQueries - 1) + queryTime) /
                    this.metrics.totalQueries;
        });
        this.prisma.$on('error', (e) => {
            logger_1.logger.error('Database error occurred', {
                error: e.message,
                target: e.target
            });
        });
    }
    setupHealthMonitoring() {
        setInterval(async () => {
            await this.checkDatabaseHealth();
        }, 30000);
    }
    async checkDatabaseHealth() {
        try {
            const startTime = Date.now();
            await this.prisma.$queryRaw `SELECT 1`;
            const responseTime = Date.now() - startTime;
            this.health = {
                isConnected: true,
                lastChecked: new Date(),
                averageResponseTime: responseTime,
                connectionPoolSize: 10,
                activeConnections: 1
            };
            if (responseTime > 10) {
                logger_1.logger.warn('Database health check slow', {
                    responseTime: `${responseTime}ms`,
                    target: '10ms'
                });
            }
        }
        catch (error) {
            this.health.isConnected = false;
            logger_1.logger.error('Database health check failed', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
        return this.health;
    }
    async cachedQuery(key, queryFn, ttlSeconds = 30) {
        try {
            const cached = await this.redis.get(key);
            if (cached) {
                this.metrics.cacheHits++;
                return JSON.parse(cached);
            }
            this.metrics.cacheMisses++;
            const startTime = Date.now();
            const result = await queryFn();
            const queryTime = Date.now() - startTime;
            await this.redis.setex(key, ttlSeconds, JSON.stringify(result));
            if (queryTime > 10) {
                logger_1.logger.warn('Slow cached query', {
                    key,
                    duration: `${queryTime}ms`,
                    target: '10ms'
                });
            }
            return result;
        }
        catch (error) {
            logger_1.logger.error('Cached query failed', {
                key,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async getUserWithStats(walletAddress) {
        return this.cachedQuery(`user:${walletAddress}`, async () => {
            return this.prisma.user.findUnique({
                where: { wallet_address: walletAddress },
                include: {
                    bets: {
                        select: {
                            amount: true,
                            payout: true,
                            status: true
                        }
                    }
                }
            });
        }, 60);
    }
    async getActiveMatches() {
        return this.cachedQuery('matches:active', async () => {
            return this.prisma.match.findMany({
                where: {
                    status: 'in_progress'
                },
                include: {
                    ai_agent_1: true,
                    ai_agent_2: true,
                    bets: {
                        select: {
                            amount: true,
                            agent_id: true
                        }
                    }
                },
                orderBy: {
                    created_at: 'desc'
                }
            });
        }, 10);
    }
    async placeBetOptimized(betData) {
        const startTime = Date.now();
        try {
            const result = await this.prisma.$transaction(async (tx) => {
                const bet = await tx.bet.create({
                    data: betData
                });
                await tx.user.update({
                    where: { id: betData.user_id },
                    data: {
                        balance: {
                            decrement: betData.amount
                        }
                    }
                });
                return bet;
            });
            await this.redis.del(`user:${betData.user_wallet}`, 'matches:active');
            const duration = Date.now() - startTime;
            if (duration > 10) {
                logger_1.logger.warn('Slow bet placement transaction', {
                    duration: `${duration}ms`,
                    target: '10ms',
                    betAmount: betData.amount
                });
            }
            return result;
        }
        catch (error) {
            logger_1.logger.error('Bet placement failed', {
                error: error instanceof Error ? error.message : String(error),
                betData
            });
            throw error;
        }
    }
    getPerformanceMetrics() {
        return { ...this.metrics };
    }
    getDatabaseHealth() {
        return { ...this.health };
    }
    getPrismaClient() {
        return this.prisma;
    }
    getRedisClient() {
        if (!this.redis) {
            logger_1.logger.warn('Redis client not available - running without cache');
            return null;
        }
        return this.redis;
    }
    async shutdown() {
        logger_1.logger.info('Shutting down database service');
        await this.prisma.$disconnect();
        if (this.redis) {
            await this.redis.quit();
        }
    }
}
exports.EnhancedDatabaseService = EnhancedDatabaseService;
let databaseService;
const getEnhancedDatabaseService = () => {
    if (!databaseService) {
        databaseService = new EnhancedDatabaseService();
    }
    return databaseService;
};
exports.getEnhancedDatabaseService = getEnhancedDatabaseService;
//# sourceMappingURL=EnhancedDatabaseService.js.map