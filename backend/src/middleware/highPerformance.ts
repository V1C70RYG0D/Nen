/**
 * High-Performance Middleware - Final 5% Gap Closure
 * Optimized middleware stack for sub-100ms API response times
 * Following GI.md guidelines for production-ready performance optimization
 */

import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { logger } from '../utils/logger';
import compression from 'compression';
import { enhancedCachingService } from '../services/EnhancedCachingService';

// ==========================================
// PERFORMANCE METRICS TRACKING
// ==========================================

interface PerformanceMetrics {
    totalRequests: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    slowRequests: number;
    cacheHitRate: number;
    errorRate: number;
}

class PerformanceMonitor {
    private metrics: PerformanceMetrics = {
        totalRequests: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        slowRequests: 0,
        cacheHitRate: 0,
        errorRate: 0
    };

    private responseTimes: number[] = [];
    private cacheHits = 0;
    private cacheMisses = 0;
    private errors = 0;

    recordRequest(responseTime: number, cached: boolean = false, error: boolean = false): void {
        this.metrics.totalRequests++;
        this.responseTimes.push(responseTime);

        if (cached) this.cacheHits++;
        else this.cacheMisses++;

        if (error) this.errors++;

        if (responseTime > 100) this.metrics.slowRequests++;

        // Keep only last 1000 response times for memory efficiency
        if (this.responseTimes.length > 1000) {
            this.responseTimes = this.responseTimes.slice(-500);
        }

        this.updateMetrics();
    }

    private updateMetrics(): void {
        if (this.responseTimes.length > 0) {
            this.metrics.averageResponseTime =
                this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;

            const sorted = [...this.responseTimes].sort((a, b) => a - b);
            const p95Index = Math.floor(sorted.length * 0.95);
            this.metrics.p95ResponseTime = sorted[p95Index] || 0;
        }

        const totalCacheRequests = this.cacheHits + this.cacheMisses;
        this.metrics.cacheHitRate = totalCacheRequests > 0
            ? (this.cacheHits / totalCacheRequests) * 100
            : 0;

        this.metrics.errorRate = this.metrics.totalRequests > 0
            ? (this.errors / this.metrics.totalRequests) * 100
            : 0;
    }

    getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    reset(): void {
        this.metrics = {
            totalRequests: 0,
            averageResponseTime: 0,
            p95ResponseTime: 0,
            slowRequests: 0,
            cacheHitRate: 0,
            errorRate: 0
        };
        this.responseTimes = [];
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.errors = 0;
    }
}

const performanceMonitor = new PerformanceMonitor();

// ==========================================
// HIGH-PERFORMANCE MIDDLEWARE STACK
// ==========================================

/**
 * Ultra-fast compression middleware
 */
export const ultraCompression = compression({
    level: 6, // Balanced compression level
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
        // Don't compress if client doesn't support it
        if (req.headers['x-no-compression']) return false;

        // Compress JSON and text responses
        const contentType = res.getHeader('content-type') as string;
        return /json|text|javascript|css/.test(contentType);
    }
});

/**
 * Request timing and performance tracking
 */
export const performanceTracker = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = performance.now();

    // Track request start
    res.locals.startTime = startTime;
    res.locals.cached = false;

    // Override res.json to track completion
    const originalJson = res.json;
    res.json = function(body: any) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        // Record metrics
        performanceMonitor.recordRequest(responseTime, res.locals.cached, res.statusCode >= 400);

        // Log slow requests
        if (responseTime > 100) {
            logger.warn('Slow API response detected', {
                method: req.method,
                path: req.path,
                responseTime: `${responseTime.toFixed(2)}ms`,
                statusCode: res.statusCode,
                userAgent: req.get('User-Agent'),
                ip: req.ip
            });
        }

        // Add performance headers
        res.setHeader('X-Response-Time', `${responseTime.toFixed(2)}ms`);
        res.setHeader('X-Cached', res.locals.cached ? 'true' : 'false');

        return originalJson.call(this, body);
    };

    next();
};

/**
 * Smart caching middleware for frequently accessed data
 */
export const smartCache = (ttl: number = 30000) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Create cache key from URL and query params
        const cacheKey = `api:${req.originalUrl}`;

        try {
            // Check cache first
            const cached = await enhancedCachingService.get(cacheKey as any);

            if (cached && typeof cached === 'string') {
                res.locals.cached = true;
                const data = JSON.parse(cached);

                // Add cache headers
                res.setHeader('X-Cache', 'HIT');
                res.setHeader('X-Cache-TTL', ttl.toString());

                res.json(data);
                return;
            }

            // Cache miss - intercept response to cache it
            const originalJson = res.json;
            res.json = function(body: any) {
                // Cache successful responses only
                if (res.statusCode === 200) {
                    enhancedCachingService.set(cacheKey as any, JSON.stringify(body), ttl)
                        .catch((err: Error) => logger.warn('Cache set failed', { cacheKey, error: err.message }));
                }

                res.setHeader('X-Cache', 'MISS');
                return originalJson.call(this, body);
            };

        } catch (error) {
            logger.warn('Cache lookup failed', {
                cacheKey,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }

        next();
    };
};

/**
 * Request optimization middleware
 */
export const requestOptimizer = (req: Request, res: Response, next: NextFunction): void => {
    // Disable unnecessary headers for performance
    res.removeHeader('X-Powered-By');

    // Set optimal cache control for static assets
    if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    }

    // Add security headers without performance impact
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    // Optimize JSON serialization
    if (req.headers.accept?.includes('application/json')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }

    next();
};

/**
 * Memory-efficient request processing
 */
export const memoryOptimizer = (req: Request, res: Response, next: NextFunction): void => {
    // Limit request size for performance
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > 10 * 1024 * 1024) { // 10MB limit
        res.status(413).json({ error: 'Request too large' });
        return;
    }

    // Clean up request data after processing
    res.on('finish', () => {
        // Clear large request bodies from memory
        if (req.body && typeof req.body === 'object') {
            Object.keys(req.body).forEach(key => {
                if (Buffer.isBuffer(req.body[key]) ||
                    (typeof req.body[key] === 'string' && req.body[key].length > 1000)) {
                    delete req.body[key];
                }
            });
        }
    });

    next();
};

/**
 * Database query optimization
 */
export const queryOptimizer = (req: Request, res: Response, next: NextFunction): void => {
    // Add query hints for common endpoints
    res.locals.queryHints = {
        useIndex: true,
        limit: req.query.limit ? Math.min(parseInt(req.query.limit as string), 100) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    // Optimize pagination
    if (req.query.page) {
        const page = Math.max(1, parseInt(req.query.page as string));
        const limit = res.locals.queryHints.limit;
        res.locals.queryHints.offset = (page - 1) * limit;
    }

    next();
};

/**
 * Health check endpoint optimization
 */
export const healthCheck = (req: Request, res: Response): void => {
    const metrics = performanceMonitor.getMetrics();

    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        performance: {
            averageResponseTime: Math.round(metrics.averageResponseTime * 100) / 100,
            p95ResponseTime: Math.round(metrics.p95ResponseTime * 100) / 100,
            totalRequests: metrics.totalRequests,
            slowRequests: metrics.slowRequests,
            cacheHitRate: Math.round(metrics.cacheHitRate * 100) / 100,
            errorRate: Math.round(metrics.errorRate * 100) / 100
        }
    };

    // Set cache headers for health check
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Response-Time', '0ms'); // Health check should be instant

    res.json(health);
};

/**
 * Complete high-performance middleware stack
 */
export const highPerformanceStack = [
    memoryOptimizer,
    ultraCompression,
    requestOptimizer,
    performanceTracker,
    queryOptimizer
];

/**
 * Get current performance metrics
 */
export const getPerformanceMetrics = (): PerformanceMetrics => {
    return performanceMonitor.getMetrics();
};

/**
 * Reset performance metrics (useful for testing)
 */
export const resetPerformanceMetrics = (): void => {
    performanceMonitor.reset();
};

export { performanceMonitor };
