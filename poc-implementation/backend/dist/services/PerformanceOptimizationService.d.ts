/**
 * Performance Optimization Service
 * Phase 4.3: Comprehensive Review/Iteration - Performance Optimization
 *
 * Implements advanced performance optimizations to meet POC Master Plan targets:
 * - API Latency: <100ms (targeting <85ms)
 * - Game Moves: <50ms (targeting <42ms)
 * - Memory optimization and garbage collection tuning
 * - Request compression and response optimization
 *

 */
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
    /**
     * Apply performance optimizations to Express app
     */
    applyOptimizations(app: express.Application): void;
    /**
     * Request optimization middleware
     * Optimizes incoming requests for faster processing
     */
    private requestOptimizationMiddleware;
    /**
     * Response time tracking middleware
     * Tracks and logs response times for performance monitoring
     */
    private responseTimeMiddleware;
    /**
     * Memory optimization middleware
     * Optimizes memory usage during request processing
     */
    private memoryOptimizationMiddleware;
    /**
     * Record response time for metrics calculation
     */
    private recordResponseTime;
    /**
     * Update performance metrics
     */
    private updateMetrics;
    /**
     * Get current performance metrics
     */
    getMetrics(): PerformanceMetrics;
    /**
     * Get performance status for health checks
     */
    getPerformanceStatus(): {
        status: 'optimal' | 'degraded' | 'critical';
        metrics: PerformanceMetrics;
        recommendations: string[];
    };
    /**
     * Optimize garbage collection for better performance
     */
    private optimizeGarbageCollection;
    /**
     * Start memory monitoring
     */
    private startMemoryMonitoring;
    /**
     * Initialize clustering for multi-core performance
     * Note: Disabled in POC for simplicity
     */
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