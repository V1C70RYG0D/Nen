import { Request, Response, NextFunction } from 'express';
interface PerformanceMetrics {
    totalRequests: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    slowRequests: number;
    cacheHitRate: number;
    errorRate: number;
}
declare class PerformanceMonitor {
    private metrics;
    private responseTimes;
    private cacheHits;
    private cacheMisses;
    private errors;
    recordRequest(responseTime: number, cached?: boolean, error?: boolean): void;
    private updateMetrics;
    getMetrics(): PerformanceMetrics;
    reset(): void;
}
declare const performanceMonitor: PerformanceMonitor;
export declare const ultraCompression: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const performanceTracker: (req: Request, res: Response, next: NextFunction) => void;
export declare const smartCache: (ttl?: number) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const requestOptimizer: (req: Request, res: Response, next: NextFunction) => void;
export declare const memoryOptimizer: (req: Request, res: Response, next: NextFunction) => void;
export declare const queryOptimizer: (req: Request, res: Response, next: NextFunction) => void;
export declare const healthCheck: (req: Request, res: Response) => void;
export declare const highPerformanceStack: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>[];
export declare const getPerformanceMetrics: () => PerformanceMetrics;
export declare const resetPerformanceMetrics: () => void;
export { performanceMonitor };
//# sourceMappingURL=highPerformance.d.ts.map