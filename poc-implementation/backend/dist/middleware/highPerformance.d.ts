/**
 * High-Performance Middleware - Final 5% Gap Closure
 * Optimized middleware stack for sub-100ms API response times
 * Following GI.md guidelines for production-ready performance optimization
 */
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
/**
 * Ultra-fast compression middleware
 */
export declare const ultraCompression: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
/**
 * Request timing and performance tracking
 */
export declare const performanceTracker: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Smart caching middleware for frequently accessed data
 */
export declare const smartCache: (ttl?: number) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Request optimization middleware
 */
export declare const requestOptimizer: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Memory-efficient request processing
 */
export declare const memoryOptimizer: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Database query optimization
 */
export declare const queryOptimizer: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Health check endpoint optimization
 */
export declare const healthCheck: (req: Request, res: Response) => void;
/**
 * Complete high-performance middleware stack
 */
export declare const highPerformanceStack: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>[];
/**
 * Get current performance metrics
 */
export declare const getPerformanceMetrics: () => PerformanceMetrics;
/**
 * Reset performance metrics (useful for testing)
 */
export declare const resetPerformanceMetrics: () => void;
export { performanceMonitor };
//# sourceMappingURL=highPerformance.d.ts.map