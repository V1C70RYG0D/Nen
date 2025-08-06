/**
 * Ultra Performance Service
 * Additional optimizations to achieve <100ms API latency target
 * Phase 4.3 - Final optimization push for POC Master Plan completion
 */
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