/**
 * Production-Ready Optimizations - Final 5% Gap Closure
 * Implementing the remaining optimizations to achieve launch-ready status
 * Following GI.md guidelines for production-grade quality and real implementations
 */
interface ProductionMetrics {
    responseTime: number;
    throughput: number;
    errorRate: number;
    activeConnections: number;
    lastUpdated: Date;
}
export declare class ProductionReadyOptimizations {
    private metrics;
    private databaseConfig;
    private cacheConfig;
    private securityConfig;
    private performanceBaseline;
    constructor();
    /**
     * Initialize all optimization configurations
     */
    private initializeConfigurations;
    /**
     * Initialize performance baselines for optimization targets
     */
    private initializePerformanceMetrics;
    /**
     * Optimize database performance with connection pooling and indexing
     */
    optimizeDatabase(): Promise<{
        success: boolean;
        optimizations: string[];
    }>;
    /**
     * Optimize multi-tier caching system (L1 Redis, L2 Database, L3 CDN)
     */
    optimizeCaching(): Promise<{
        success: boolean;
        cacheLayers: any;
    }>;
    /**
     * Optimize security with multi-sig vaults and compliance
     */
    optimizeSecurity(): Promise<{
        success: boolean;
        securityFeatures: any;
    }>;
    /**
     * Optimize MagicBlock BOLT integration for <50ms gaming latency
     */
    optimizeMagicBlockBOLT(): Promise<{
        success: boolean;
        boltOptimizations: any;
    }>;
    /**
     * Comprehensive performance monitoring and metrics collection
     */
    monitorPerformance(): Promise<ProductionMetrics>;
    /**
     * Validate all optimizations meet POC backend plan requirements
     */
    validateOptimizations(): Promise<{
        success: boolean;
        validation: any;
    }>;
    private createMaterializedViews;
    private optimizeDatabaseIndexes;
    private optimizeRedisCache;
    private optimizeDatabaseCache;
    private optimizeCDNCache;
    private setupMultiSigVaults;
    private setupKYCAMLCompliance;
    private setupFraudDetection;
    private optimizeBOLTECS;
    private optimizeEphemeralRollups;
    private optimizeGameWebSockets;
    private measureAPIResponseTime;
    private measureWebSocketLatency;
    private measureThroughput;
    private calculateErrorRate;
    private countActiveConnections;
    /**
     * Get current production metrics
     */
    getMetrics(): ProductionMetrics;
    /**
     * Get optimization configurations
     */
    getConfigurations(): any;
}
export declare const productionOptimizations: ProductionReadyOptimizations;
export {};
//# sourceMappingURL=ProductionReadyOptimizations.d.ts.map