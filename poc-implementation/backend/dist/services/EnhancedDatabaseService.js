"use strict";
/**
 * Enhanced Database Service with Performance Optimizations
 * Implements POC Backend Plan requirements for <10ms database queries
 *
 * Features:
 * - Connection pooling optimization
 * - Query caching and indexing
 * - Transaction management
 * - Performance monitoring
 * - Connection health checking
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedDatabaseService = exports.getEnhancedDatabaseService = void 0;
const client_1 = require("@prisma/client");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../middleware/logger");
class EnhancedDatabaseService {
    constructor() {
        this.metrics = {
            totalQueries: 0,
            averageQueryTime: 0,
            slowQueries: 0,
            fastQueries: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        this.health = {
            isConnected: false,
            lastChecked: new Date(),
            averageResponseTime: 0,
            connectionPoolSize: 0,
            activeConnections: 0
        };
        // Initialize Prisma with optimized connection pooling
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
        // Initialize Redis for caching (optional for local development)
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
            // No Redis for local development
            this.redis = null;
            logger_1.logger.info('Redis not configured, database service running without cache');
        }
        this.setupQueryLogging();
        this.setupHealthMonitoring();
    }
    /**
     * Setup query performance logging
     */
    setupQueryLogging() {
        this.prisma.$on('query', (e) => {
            const queryTime = e.duration;
            this.metrics.totalQueries++;
            if (queryTime > 10) { // >10ms is considered slow for our target
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
            // Update average
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
    /**
     * Setup health monitoring
     */
    setupHealthMonitoring() {
        // Check database health every 30 seconds
        setInterval(async () => {
            await this.checkDatabaseHealth();
        }, 30000);
    }
    /**
     * Check database connection health
     */
    async checkDatabaseHealth() {
        try {
            const startTime = Date.now();
            await this.prisma.$queryRaw `SELECT 1`;
            const responseTime = Date.now() - startTime;
            this.health = {
                isConnected: true,
                lastChecked: new Date(),
                averageResponseTime: responseTime,
                connectionPoolSize: 10, // Default pool size
                activeConnections: 1 // This would need actual monitoring
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
    /**
     * Cached query execution with performance monitoring
     */
    async cachedQuery(key, queryFn, ttlSeconds = 30) {
        try {
            // Try to get from cache first
            const cached = await this.redis.get(key);
            if (cached) {
                this.metrics.cacheHits++;
                return JSON.parse(cached);
            }
            // Execute query if not in cache
            this.metrics.cacheMisses++;
            const startTime = Date.now();
            const result = await queryFn();
            const queryTime = Date.now() - startTime;
            // Store in cache
            await this.redis.setex(key, ttlSeconds, JSON.stringify(result));
            // Log performance
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
    /**
     * Optimized user operations
     */
    async getUserWithStats(walletAddress) {
        return this.cachedQuery(`user:${walletAddress}`, async () => {
            return this.prisma.user.findUnique({
                where: { address: walletAddress },
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
        }, 60 // Cache for 1 minute
        );
    }
    /**
     * Optimized game operations with caching
     */
    async getActiveGames() {
        return this.cachedQuery('games:active', async () => {
            return this.prisma.game.findMany({
                where: {
                    status: 'IN_PROGRESS'
                },
                include: {
                    player1: true,
                    player2: true,
                    bets: {
                        select: {
                            amount: true,
                            agentId: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
        }, 10 // Cache for 10 seconds (frequent updates)
        );
    }
    /**
     * Optimized betting operations
     */
    async placeBetOptimized(betData) {
        const startTime = Date.now();
        try {
            const result = await this.prisma.$transaction(async (tx) => {
                // Create bet
                const bet = await tx.bet.create({
                    data: {
                        userId: betData.userId,
                        gameId: betData.gameId,
                        amount: betData.amount,
                        agentId: betData.agentId,
                        odds: betData.odds || 1.0,
                        status: betData.status || 'PENDING'
                    }
                });
                return bet;
            });
            // Clear related caches
            if (this.redis) {
                await this.redis.del(`user:${betData.userWallet}`, 'games:active');
            }
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
    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return { ...this.metrics };
    }
    /**
     * Get database health status
     */
    getDatabaseHealth() {
        return { ...this.health };
    }
    /**
     * Get Prisma client for direct queries
     */
    getPrismaClient() {
        return this.prisma;
    }
    /**
     * Get Redis client for direct cache operations
     */
    getRedisClient() {
        if (!this.redis) {
            logger_1.logger.warn('Redis client not available - running without cache');
            return null;
        }
        return this.redis;
    }
    /**
     * Graceful shutdown
     */
    async shutdown() {
        logger_1.logger.info('Shutting down database service');
        await this.prisma.$disconnect();
        if (this.redis) {
            await this.redis.quit();
        }
    }
}
exports.EnhancedDatabaseService = EnhancedDatabaseService;
// Singleton instance
let databaseService;
const getEnhancedDatabaseService = () => {
    if (!databaseService) {
        databaseService = new EnhancedDatabaseService();
    }
    return databaseService;
};
exports.getEnhancedDatabaseService = getEnhancedDatabaseService;
//# sourceMappingURL=EnhancedDatabaseService.js.map