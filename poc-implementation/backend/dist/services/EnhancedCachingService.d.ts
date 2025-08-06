/**
 * Enhanced Multi-Tier Caching Service
 *
 * Implements advanced caching architecture as specified in POC Master Plan:
 * - Level 1: In-memory cache for ultra-fast access (<1ms)
 * - Level 2: Redis cache for shared data (<10ms)
 * - Level 3: Database cache with intelligent prefetching (<50ms)
 * - Geographic distribution support for global performance
 * - Cache invalidation strategies for data consistency
 *

 * - Real implementations over simulations
 * - Production-ready with error handling
 * - Performance optimized for <50ms latency targets
 */
import { GameState, Move } from './GungiGameEngine';
interface CacheConfig {
    enableL1Cache: boolean;
    enableL2Cache: boolean;
    enableL3Cache: boolean;
    enableGeographicDistribution: boolean;
    l1TtlSeconds: number;
    l2TtlSeconds: number;
    l3TtlSeconds: number;
    maxMemoryUsage: number;
    compressionEnabled: boolean;
    metricsEnabled: boolean;
}
interface CacheMetrics {
    l1Hits: number;
    l1Misses: number;
    l2Hits: number;
    l2Misses: number;
    l3Hits: number;
    l3Misses: number;
    averageLatency: number;
    totalRequests: number;
    lastReset: Date;
}
interface CacheKey {
    type: 'game_state' | 'ai_move' | 'match_data' | 'user_profile' | 'betting_odds' | 'nft_metadata' | 'ai_agent' | 'betting_pool';
    identifier: string;
    version?: string;
    geographic_region?: string;
}
export declare class EnhancedCachingService {
    private l1Cache;
    private l2Cache;
    private config;
    private metrics;
    private isInitialized;
    constructor(config?: Partial<CacheConfig>);
    private initializeCaches;
    /**
     * Get data from cache with multi-tier fallback
     * Follows the POC Master Plan <50ms latency requirement
     */
    get<T>(key: CacheKey): Promise<T | null>;
    /**
     * Set data in cache with multi-tier write-through
     */
    set<T>(key: CacheKey, value: T, ttlSeconds?: number): Promise<boolean>;
    /**
     * Delete data from all cache levels
     */
    delete(key: CacheKey): Promise<boolean>;
    /**
     * Cache game state with optimized serialization
     */
    cacheGameState(gameId: string, gameState: GameState): Promise<boolean>;
    /**
     * Retrieve cached game state
     */
    getCachedGameState(gameId: string): Promise<GameState | null>;
    /**
     * Cache AI move calculations for reuse
     */
    cacheAIMove(gameId: string, boardHash: string, move: Move, difficulty: string): Promise<boolean>;
    /**
     * Get cached AI move
     */
    getCachedAIMove(gameId: string, boardHash: string, difficulty: string): Promise<Move | null>;
    private buildCacheKey;
    private updateLatencyMetrics;
    /**
     * Get cache performance metrics
     */
    getCacheMetrics(): CacheMetrics;
    /**
     * Reset cache metrics
     */
    resetMetrics(): void;
    /**
     * Warm up cache with frequently accessed data
     */
    warmupCache(): Promise<void>;
    /**
     * Graceful shutdown
     */
    shutdown(): Promise<void>;
}
export declare const enhancedCachingService: EnhancedCachingService;
export {};
//# sourceMappingURL=EnhancedCachingService.d.ts.map