import express from 'express';
interface PerformanceConfig {
    enableCompression: boolean;
    enableClustering: boolean;
    enableResponseCaching: boolean;
    enableRequestOptimization: boolean;
    maxRequestSize: string;
    compressionLevel: number;
    gcOptimization: boolean;
    memoryMonitoring: boolean;
}
interface PerformanceMetrics {
    responseTimeP95: number;
    responseTimeP99: number;
    averageResponseTime: number;
    requestsPerSecond: number;
    memoryUsage: number;
    cpuUsage: number;
    errorRate: number;
    uptime: number;
}
export declare class PerformanceOptimizationService {
    private config;
    private metrics;
    private responseTimes;
    private startTime;
    constructor(config?: Partial<PerformanceConfig>);
    private initializeMetrics;
    applyOptimizations(app: express.Application): void;
    private requestOptimizationMiddleware;
    private responseTimeMiddleware;
    private memoryOptimizationMiddleware;
    private recordResponseTime;
    private updateMetrics;
    getMetrics(): PerformanceMetrics;
    getPerformanceStatus(): {
        status: 'optimal' | 'degraded' | 'critical';
        metrics: PerformanceMetrics;
        recommendations: string[];
    };
    private optimizeGarbageCollection;
    private startMemoryMonitoring;
    static initializeClustering(): boolean;
}
export declare const performanceOptimizer: PerformanceOptimizationService;
declare global {
    namespace Express {
        interface Request {
            optimizationStartTime?: number;
            cachedResults?: any;
        }
    }
}
export {};
//# sourceMappingURL=PerformanceOptimizationService.d.ts.map