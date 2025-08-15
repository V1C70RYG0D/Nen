"use strict";
/**
 * High-Performance Middleware - Final 5% Gap Closure
 * Optimized middleware stack for sub-100ms API response times
 * Following GI.md guidelines for production-ready performance optimization
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceMonitor = exports.resetPerformanceMetrics = exports.getPerformanceMetrics = exports.highPerformanceStack = exports.healthCheck = exports.queryOptimizer = exports.memoryOptimizer = exports.requestOptimizer = exports.smartCache = exports.performanceTracker = exports.ultraCompression = void 0;
const perf_hooks_1 = require("perf_hooks");
const logger_1 = require("../utils/logger");
const compression_1 = __importDefault(require("compression"));
const EnhancedCachingService_1 = require("../services/EnhancedCachingService");
class PerformanceMonitor {
    constructor() {
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
    recordRequest(responseTime, cached = false, error = false) {
        this.metrics.totalRequests++;
        this.responseTimes.push(responseTime);
        if (cached)
            this.cacheHits++;
        else
            this.cacheMisses++;
        if (error)
            this.errors++;
        if (responseTime > 100)
            this.metrics.slowRequests++;
        // Keep only last 1000 response times for memory efficiency
        if (this.responseTimes.length > 1000) {
            this.responseTimes = this.responseTimes.slice(-500);
        }
        this.updateMetrics();
    }
    updateMetrics() {
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
    getMetrics() {
        return { ...this.metrics };
    }
    reset() {
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
exports.performanceMonitor = performanceMonitor;
// ==========================================
// HIGH-PERFORMANCE MIDDLEWARE STACK
// ==========================================
/**
 * Ultra-fast compression middleware
 */
exports.ultraCompression = (0, compression_1.default)({
    level: 6, // Balanced compression level
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
        // Don't compress if client doesn't support it
        if (req.headers['x-no-compression'])
            return false;
        // Compress JSON and text responses
        const contentType = res.getHeader('content-type');
        return /json|text|javascript|css/.test(contentType);
    }
});
/**
 * Request timing and performance tracking
 */
const performanceTracker = (req, res, next) => {
    const startTime = perf_hooks_1.performance.now();
    // Track request start
    res.locals.startTime = startTime;
    res.locals.cached = false;
    // Override res.json to track completion
    const originalJson = res.json;
    res.json = function (body) {
        const endTime = perf_hooks_1.performance.now();
        const responseTime = endTime - startTime;
        // Record metrics
        performanceMonitor.recordRequest(responseTime, res.locals.cached, res.statusCode >= 400);
        // Log slow requests
        if (responseTime > 100) {
            logger_1.logger.warn('Slow API response detected', {
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
exports.performanceTracker = performanceTracker;
/**
 * Smart caching middleware for frequently accessed data
 */
const smartCache = (ttl = 30000) => {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }
        // Create cache key from URL and query params
        const cacheKey = `api:${req.originalUrl}`;
        try {
            // Check cache first
            const cached = await EnhancedCachingService_1.enhancedCachingService.get(cacheKey);
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
            res.json = function (body) {
                // Cache successful responses only
                if (res.statusCode === 200) {
                    EnhancedCachingService_1.enhancedCachingService.set(cacheKey, JSON.stringify(body), ttl)
                        .catch((err) => logger_1.logger.warn('Cache set failed', { cacheKey, error: err.message }));
                }
                res.setHeader('X-Cache', 'MISS');
                return originalJson.call(this, body);
            };
        }
        catch (error) {
            logger_1.logger.warn('Cache lookup failed', {
                cacheKey,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
        next();
    };
};
exports.smartCache = smartCache;
/**
 * Request optimization middleware
 */
const requestOptimizer = (req, res, next) => {
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
exports.requestOptimizer = requestOptimizer;
/**
 * Memory-efficient request processing
 */
const memoryOptimizer = (req, res, next) => {
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
exports.memoryOptimizer = memoryOptimizer;
/**
 * Database query optimization
 */
const queryOptimizer = (req, res, next) => {
    // Add query hints for common endpoints
    res.locals.queryHints = {
        useIndex: true,
        limit: req.query.limit ? Math.min(parseInt(req.query.limit), 100) : 50,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
    };
    // Optimize pagination
    if (req.query.page) {
        const page = Math.max(1, parseInt(req.query.page));
        const limit = res.locals.queryHints.limit;
        res.locals.queryHints.offset = (page - 1) * limit;
    }
    next();
};
exports.queryOptimizer = queryOptimizer;
/**
 * Health check endpoint optimization
 */
const healthCheck = (req, res) => {
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
exports.healthCheck = healthCheck;
/**
 * Complete high-performance middleware stack
 */
exports.highPerformanceStack = [
    exports.memoryOptimizer,
    exports.ultraCompression,
    exports.requestOptimizer,
    exports.performanceTracker,
    exports.queryOptimizer
];
/**
 * Get current performance metrics
 */
const getPerformanceMetrics = () => {
    return performanceMonitor.getMetrics();
};
exports.getPerformanceMetrics = getPerformanceMetrics;
/**
 * Reset performance metrics (useful for testing)
 */
const resetPerformanceMetrics = () => {
    performanceMonitor.reset();
};
exports.resetPerformanceMetrics = resetPerformanceMetrics;
//# sourceMappingURL=highPerformance.js.map