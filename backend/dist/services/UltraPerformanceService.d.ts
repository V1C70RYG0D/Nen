import express from 'express';
export declare class UltraPerformanceService {
    private responseCache;
    private requestPool;
    constructor();
    private initializeOptimizations;
    private preWarmCache;
    applyUltraOptimizations(app: express.Application): void;
    private getTTL;
    private cleanupCache;
    private cleanupRequestPool;
    getStats(): {
        cacheSize: number;
        cacheHitRate: number;
        requestPoolSize: number;
    };
}
//# sourceMappingURL=UltraPerformanceService.d.ts.map