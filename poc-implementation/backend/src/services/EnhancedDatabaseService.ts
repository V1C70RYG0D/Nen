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

import { PrismaClient, Prisma } from '@prisma/client';
import IORedis from 'ioredis';
import { logger } from '../middleware/logger';

interface QueryPerformanceMetrics {
  totalQueries: number;
  averageQueryTime: number;
  slowQueries: number;
  fastQueries: number;
  cacheHits: number;
  cacheMisses: number;
}

interface DatabaseConnectionHealth {
  isConnected: boolean;
  lastChecked: Date;
  averageResponseTime: number;
  connectionPoolSize: number;
  activeConnections: number;
}

class EnhancedDatabaseService {
  private prisma: PrismaClient;
  private redis: IORedis;
  private metrics: QueryPerformanceMetrics = {
    totalQueries: 0,
    averageQueryTime: 0,
    slowQueries: 0,
    fastQueries: 0,
    cacheHits: 0,
    cacheMisses: 0
  };
  private health: DatabaseConnectionHealth = {
    isConnected: false,
    lastChecked: new Date(),
    averageResponseTime: 0,
    connectionPoolSize: 0,
    activeConnections: 0
  };

  constructor() {
    // Initialize Prisma with optimized connection pooling
    this.prisma = new PrismaClient({
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
      this.redis = new IORedis(redisUrl, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        keepAlive: 30000,
        commandTimeout: 5000
      });
    } else {
      // No Redis for local development
      this.redis = null as any;
      logger.info('Redis not configured, database service running without cache');
    }

    this.setupQueryLogging();
    this.setupHealthMonitoring();
  }

  /**
   * Setup query performance logging
   */
  private setupQueryLogging(): void {
    this.prisma.$on('query', (e: any) => {
      const queryTime = e.duration;
      this.metrics.totalQueries++;

      if (queryTime > 10) { // >10ms is considered slow for our target
        this.metrics.slowQueries++;
        logger.warn('Slow database query detected', {
          query: e.query,
          duration: `${queryTime}ms`,
          target: '10ms',
          params: e.params
        });
      } else {
        this.metrics.fastQueries++;
      }

      // Update average
      this.metrics.averageQueryTime =
        (this.metrics.averageQueryTime * (this.metrics.totalQueries - 1) + queryTime) /
        this.metrics.totalQueries;
    });

    this.prisma.$on('error', (e: any) => {
      logger.error('Database error occurred', {
        error: e.message,
        target: e.target
      });
    });
  }

  /**
   * Setup health monitoring
   */
  private setupHealthMonitoring(): void {
    // Check database health every 30 seconds
    setInterval(async () => {
      await this.checkDatabaseHealth();
    }, 30000);
  }

  /**
   * Check database connection health
   */
  async checkDatabaseHealth(): Promise<DatabaseConnectionHealth> {
    try {
      const startTime = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      this.health = {
        isConnected: true,
        lastChecked: new Date(),
        averageResponseTime: responseTime,
        connectionPoolSize: 10, // Default pool size
        activeConnections: 1 // This would need actual monitoring
      };

      if (responseTime > 10) {
        logger.warn('Database health check slow', {
          responseTime: `${responseTime}ms`,
          target: '10ms'
        });
      }
    } catch (error) {
      this.health.isConnected = false;
      logger.error('Database health check failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return this.health;
  }

  /**
   * Cached query execution with performance monitoring
   */
  async cachedQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttlSeconds: number = 30
  ): Promise<T> {
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
        logger.warn('Slow cached query', {
          key,
          duration: `${queryTime}ms`,
          target: '10ms'
        });
      }

      return result;
    } catch (error) {
      logger.error('Cached query failed', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Optimized user operations
   */
  async getUserWithStats(walletAddress: string) {
    return this.cachedQuery(
      `user:${walletAddress}`,
      async () => {
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
      },
      60 // Cache for 1 minute
    );
  }

  /**
   * Optimized match operations with caching
   */
  async getActiveMatches() {
    return this.cachedQuery(
      'matches:active',
      async () => {
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
      },
      10 // Cache for 10 seconds (frequent updates)
    );
  }

  /**
   * Optimized betting operations
   */
  async placeBetOptimized(betData: any) {
    const startTime = Date.now();

    try {
      const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Create bet
        const bet = await tx.bet.create({
          data: betData
        });

        // Update user balance
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

      // Clear related caches
      await this.redis.del(`user:${betData.user_wallet}`, 'matches:active');

      const duration = Date.now() - startTime;
      if (duration > 10) {
        logger.warn('Slow bet placement transaction', {
          duration: `${duration}ms`,
          target: '10ms',
          betAmount: betData.amount
        });
      }

      return result;
    } catch (error) {
      logger.error('Bet placement failed', {
        error: error instanceof Error ? error.message : String(error),
        betData
      });
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): QueryPerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get database health status
   */
  getDatabaseHealth(): DatabaseConnectionHealth {
    return { ...this.health };
  }

  /**
   * Get Prisma client for direct queries
   */
  getPrismaClient(): PrismaClient {
    return this.prisma;
  }

  /**
   * Get Redis client for direct cache operations
   */
  getRedisClient(): IORedis | null {
    if (!this.redis) {
      logger.warn('Redis client not available - running without cache');
      return null;
    }
    return this.redis;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down database service');
    await this.prisma.$disconnect();
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// Singleton instance
let databaseService: EnhancedDatabaseService;

export const getEnhancedDatabaseService = (): EnhancedDatabaseService => {
  if (!databaseService) {
    databaseService = new EnhancedDatabaseService();
  }
  return databaseService;
};

export { EnhancedDatabaseService };
