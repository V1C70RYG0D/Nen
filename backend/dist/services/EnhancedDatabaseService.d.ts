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
    private setupQueryLogging;
    private setupHealthMonitoring;
    checkDatabaseHealth(): Promise<DatabaseConnectionHealth>;
    cachedQuery<T>(key: string, queryFn: () => Promise<T>, ttlSeconds?: number): Promise<T>;
    getUserWithStats(walletAddress: string): Promise<{
        publicKey: string | null;
        id: string;
        address: string | null;
        level: number;
        username: string;
        email: string;
        password: string | null;
        experience: number;
        winRate: number;
        totalGames: number;
        oauthProvider: string | null;
        oauthId: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    getActiveMatches(): Promise<any>;
    placeBetOptimized(betData: any): Promise<{
        id: string;
        gameId: string;
        agentId: string | null;
        status: import(".prisma/client").$Enums.BetStatus;
        userId: string;
        amount: number;
        odds: number;
        payout: number | null;
        placedAt: Date;
        settledAt: Date | null;
    }>;
    getPerformanceMetrics(): QueryPerformanceMetrics;
    getDatabaseHealth(): DatabaseConnectionHealth;
    getPrismaClient(): PrismaClient;
    getRedisClient(): IORedis | null;
    shutdown(): Promise<void>;
}
export declare const getEnhancedDatabaseService: () => EnhancedDatabaseService;
export { EnhancedDatabaseService };
//# sourceMappingURL=EnhancedDatabaseService.d.ts.map