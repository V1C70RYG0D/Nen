/**
 * MagicBlock Cache Optimization Module
 *
 * Implements high-performance caching strategies for MagicBlock POC
 * - L1 Cache: In-memory cache for sub-1ms access
 * - L2 Cache: Redis cache for sub-5ms access
 * - Intelligent cache warming and preloading
 * - Performance monitoring and optimization
 */
interface CacheMetrics {
    l1Hits: number;
    l1Misses: number;
    l2Hits: number;
    l2Misses: number;
    avgL1Latency: number;
    avgL2Latency: number;
    totalRequests: number;
}
declare class CacheOptimizer {
    private l1Cache;
    private l1MaxSize;
    private l2MaxSize;
    private metrics;
    private performanceMonitor;
    private redis;
    constructor();
    /**
     * Get data from cache with automatic fallback strategy
     */
    get<T>(key: string, fallbackFn?: () => Promise<T> | T, ttl?: number): Promise<T | null>;
    /**
     * Set data in cache with intelligent placement
     */
    set<T>(key: string, data: T, ttl?: number): Promise<void>;
    /**
     * Warm cache with frequently accessed data
     */
    warmCache(warmupData: Array<{
        key: string;
        data: any;
        ttl?: number;
    }>): Promise<void>;
    /**
     * Pre-load game session data for optimal performance
     */
    preloadGameSession(sessionId: string, gameData: any): Promise<void>;
    /**
     * Get cache metrics and performance data
     */
    getMetrics(): CacheMetrics & {
        hitRate: number;
        l1HitRate: number;
        l2HitRate: number;
    };
    /**
     * L1 Cache operations (In-Memory)
     */
    private getFromL1;
    private setInL1;
    /**
     * L2 Cache operations (Redis)
     */
    private getFromL2;
    private setInL2;
    /**
     * Cache maintenance and optimization
     */
    private evictLRU;
    private startCacheMaintenance;
    private updateL1Latency;
    private updateL2Latency;
    /**
     * Clear all cache data
     */
    clear(): Promise<void>;
    /**
     * Get cache size information
     */
    getCacheSize(): {
        l1Size: number;
        l1MaxSize: number;
        l2MaxSize: number;
    };
}
export declare const cacheOptimizer: CacheOptimizer;
/**
 * High-performance cache decorator for frequently accessed functions
 */
export declare function cached(ttl?: number): (target: any, propertyName: string, descriptor: PropertyDescriptor) => void;
export default cacheOptimizer;
//# sourceMappingURL=cache-optimizer.d.ts.map