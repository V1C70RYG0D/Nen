import { Request, Response, NextFunction } from 'express';
interface PerformanceMetrics {
    requestCount: number;
    totalResponseTime: number;
    averageResponseTime: number;
    slowRequests: number;
    fastRequests: number;
}
export declare const performanceTracker: (req: Request, res: Response, next: NextFunction) => void;
export declare const performanceCompression: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const cacheOptimization: (req: Request, res: Response, next: NextFunction) => void;
export declare const memoryMonitoring: (req: Request, res: Response, next: NextFunction) => void;
export declare const getPerformanceMetrics: () => PerformanceMetrics;
export declare const resetPerformanceMetrics: () => void;
export {};
//# sourceMappingURL=performance.d.ts.map