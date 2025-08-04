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
    get<T>(key: CacheKey): Promise<T | null>;
    set<T>(key: CacheKey, value: T, ttlSeconds?: number): Promise<boolean>;
    delete(key: CacheKey): Promise<boolean>;
    cacheGameState(gameId: string, gameState: GameState): Promise<boolean>;
    getCachedGameState(gameId: string): Promise<GameState | null>;
    cacheAIMove(gameId: string, boardHash: string, move: Move, difficulty: string): Promise<boolean>;
    getCachedAIMove(gameId: string, boardHash: string, difficulty: string): Promise<Move | null>;
    private buildCacheKey;
    private updateLatencyMetrics;
    getCacheMetrics(): CacheMetrics;
    resetMetrics(): void;
    warmupCache(): Promise<void>;
    shutdown(): Promise<void>;
}
export declare const enhancedCachingService: EnhancedCachingService;
export {};
//# sourceMappingURL=EnhancedCachingService.d.ts.map