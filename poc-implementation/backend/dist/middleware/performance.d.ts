/**
 * Performance Optimization Middleware
 * Implements <100ms API target requirements from POC Backend Plan
 *
 * Features:
 * - Response time tracking
 * - Request compression
 * - Caching headers
 * - Connection pooling optimizations
 * - Memory usage monitoring
 */
import { Request, Response, NextFunction } from 'express';
interface PerformanceMetrics {
    requestCount: number;
    totalResponseTime: number;
    averageResponseTime: number;
    slowRequests: number;
    fastRequests: number;
}
/**
 * Response time tracking middleware
 * Ensures <100ms API target compliance
 */
export declare const performanceTracker: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Compression middleware for performance optimization
 */
export declare const performanceCompression: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
/**
 * Cache optimization headers
 */
export declare const cacheOptimization: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Memory usage monitoring middleware
 */
export declare const memoryMonitoring: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Get current performance metrics
 */
export declare const getPerformanceMetrics: () => PerformanceMetrics;
/**
 * Reset performance metrics
 */
export declare const resetPerformanceMetrics: () => void;
export {};
//# sourceMappingURL=performance.d.ts.map