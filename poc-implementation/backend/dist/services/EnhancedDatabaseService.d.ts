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
    getUserWithStats(walletAddress: string): Promise<({
        bets: {
            amount: number;
            status: import(".prisma/client").$Enums.BetStatus;
            payout: number | null;
        }[];
    } & {
        level: number;
        id: string;
        username: string;
        email: string;
        password: string | null;
        publicKey: string | null;
        address: string | null;
        experience: number;
        winRate: number;
        totalGames: number;
        oauthProvider: string | null;
        oauthId: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    /**
     * Optimized game operations with caching
     */
    getActiveGames(): Promise<({
        bets: {
            agentId: string | null;
            amount: number;
        }[];
        player1: {
            level: number;
            id: string;
            username: string;
            email: string;
            password: string | null;
            publicKey: string | null;
            address: string | null;
            experience: number;
            winRate: number;
            totalGames: number;
            oauthProvider: string | null;
            oauthId: string | null;
            isActive: boolean;
            lastLoginAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
        player2: {
            level: number;
            id: string;
            username: string;
            email: string;
            password: string | null;
            publicKey: string | null;
            address: string | null;
            experience: number;
            winRate: number;
            totalGames: number;
            oauthProvider: string | null;
            oauthId: string | null;
            isActive: boolean;
            lastLoginAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.GameStatus;
        player1Id: string;
        player2Id: string | null;
        winnerId: string | null;
        aiDifficulty: string | null;
        betAmount: number;
        boardState: Prisma.JsonValue;
        moveHistory: Prisma.JsonValue;
        startedAt: Date | null;
        completedAt: Date | null;
    })[]>;
    /**
     * Optimized betting operations
     */
    placeBetOptimized(betData: any): Promise<{
        id: string;
        userId: string;
        gameId: string;
        agentId: string | null;
        amount: number;
        odds: number;
        status: import(".prisma/client").$Enums.BetStatus;
        payout: number | null;
        placedAt: Date;
        settledAt: Date | null;
    }>;
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