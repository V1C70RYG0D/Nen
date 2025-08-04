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
    private initializeConfigurations;
    private initializePerformanceMetrics;
    optimizeDatabase(): Promise<{
        success: boolean;
        optimizations: string[];
    }>;
    optimizeCaching(): Promise<{
        success: boolean;
        cacheLayers: any;
    }>;
    optimizeSecurity(): Promise<{
        success: boolean;
        securityFeatures: any;
    }>;
    optimizeMagicBlockBOLT(): Promise<{
        success: boolean;
        boltOptimizations: any;
    }>;
    monitorPerformance(): Promise<ProductionMetrics>;
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
    getMetrics(): ProductionMetrics;
    getConfigurations(): any;
}
export declare const productionOptimizations: ProductionReadyOptimizations;
export {};
//# sourceMappingURL=ProductionReadyOptimizations.d.ts.map