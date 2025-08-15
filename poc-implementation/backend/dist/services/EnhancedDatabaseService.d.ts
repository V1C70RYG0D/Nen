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
import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';
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
declare class EnhancedDatabaseService {
    private prisma;
    private redis;
    private metrics;
    private health;
    constructor();
    /**
     * Setup query performance logging
     */
    private setupQueryLogging;
    /**
     * Setup health monitoring
     */
    private setupHealthMonitoring;
    /**
     * Check database connection health
     */
    checkDatabaseHealth(): Promise<DatabaseConnectionHealth>;
    /**
     * Cached query execution with performance monitoring
     */
    cachedQuery<T>(key: string, queryFn: () => Promise<T>, ttlSeconds?: number): Promise<T>;
    /**
     * Optimized user operations
     */
    getUserWithStats(walletAddress: string): Promise<any>;
    /**
     * Optimized game operations with caching
     */
    getActiveGames(): Promise<any>;
    /**
     * Optimized betting operations
     */
    placeBetOptimized(betData: any): Promise<any>;
    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): QueryPerformanceMetrics;
    /**
     * Get database health status
     */
    getDatabaseHealth(): DatabaseConnectionHealth;
    /**
     * Get Prisma client for direct queries
     */
    getPrismaClient(): PrismaClient;
    /**
     * Get Redis client for direct cache operations
     */
    getRedisClient(): IORedis | null;
    /**
     * Graceful shutdown
     */
    shutdown(): Promise<void>;
}
export declare const getEnhancedDatabaseService: () => EnhancedDatabaseService;
export { EnhancedDatabaseService };
//# sourceMappingURL=EnhancedDatabaseService.d.ts.map