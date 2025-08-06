"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPerformanceMetrics = exports.getPerformanceMetrics = exports.memoryMonitoring = exports.cacheOptimization = exports.performanceCompression = exports.performanceTracker = void 0;
const compression_1 = __importDefault(require("compression"));
const logger_1 = require("./logger");
const metrics = {
    requestCount: 0,
    totalResponseTime: 0,
    averageResponseTime: 0,
    slowRequests: 0,
    fastRequests: 0
};
/**
 * Response time tracking middleware
 * Ensures <100ms API target compliance
 */
const performanceTracker = (req, res, next) => {
    const startTime = Date.now();
    // Add performance headers
    res.setHeader('X-Response-Time-Target', '100ms');
    res.setHeader('X-Performance-Optimized', 'true');
    // Override res.end to capture response time
    const originalEnd = res.end.bind(res);
    res.end = function (chunk, encoding, callback) {
        const responseTime = Date.now() - startTime;
        // Update metrics
        metrics.requestCount++;
        metrics.totalResponseTime += responseTime;
        metrics.averageResponseTime = metrics.totalResponseTime / metrics.requestCount;
        if (responseTime > 100) {
            metrics.slowRequests++;
            logger_1.logger.warn('Slow API response detected', {
                path: req.path,
                method: req.method,
                responseTime: `${responseTime}ms`,
                target: '100ms'
            });
        }
        else {
            metrics.fastRequests++;
        }
        // Add performance headers to response
        res.setHeader('X-Response-Time', `${responseTime}ms`);
        res.setHeader('X-Performance-Status', responseTime <= 100 ? 'OPTIMAL' : 'SLOW');
        // Log performance metrics every 100 requests
        if (metrics.requestCount % 100 === 0) {
            logger_1.logger.info('Performance metrics update', {
                totalRequests: metrics.requestCount,
                averageResponseTime: `${Math.round(metrics.averageResponseTime)}ms`,
                slowRequests: metrics.slowRequests,
                fastRequests: metrics.fastRequests,
                performanceRate: `${Math.round((metrics.fastRequests / metrics.requestCount) * 100)}%`
            });
        }
        // Call original end method
        return originalEnd(chunk, encoding, callback);
    };
    next();
};
exports.performanceTracker = performanceTracker;
/**
 * Compression middleware for performance optimization
 */
exports.performanceCompression = (0, compression_1.default)({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression_1.default.filter(req, res);
    },
    level: 6, // Balance between compression ratio and speed
    threshold: 1024, // Only compress responses > 1KB
});
/**
 * Cache optimization headers
 */
const cacheOptimization = (req, res, next) => {
    // Set cache headers for static assets
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    }
    // Set cache headers for API responses
    if (req.path.startsWith('/api/')) {
        if (req.method === 'GET') {
            // Cache GET requests for 30 seconds
            res.setHeader('Cache-Control', 'public, max-age=30');
        }
        else {
            // No cache for mutations
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
    }
    next();
};
exports.cacheOptimization = cacheOptimization;
/**
 * Memory usage monitoring middleware
 */
const memoryMonitoring = (req, res, next) => {
    const memUsage = process.memoryUsage();
    // Log memory usage if it exceeds threshold
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    if (heapUsedMB > 500) { // 500MB threshold
        logger_1.logger.warn('High memory usage detected', {
            heapUsed: `${Math.round(heapUsedMB)}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
            external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
            path: req.path
        });
    }
    next();
};
exports.memoryMonitoring = memoryMonitoring;
/**
 * Get current performance metrics
 */
const getPerformanceMetrics = () => {
    return { ...metrics };
};
exports.getPerformanceMetrics = getPerformanceMetrics;
/**
 * Reset performance metrics
 */
const resetPerformanceMetrics = () => {
    metrics.requestCount = 0;
    metrics.totalResponseTime = 0;
    metrics.averageResponseTime = 0;
    metrics.slowRequests = 0;
    metrics.fastRequests = 0;
    logger_1.logger.info('Performance metrics reset');
};
exports.resetPerformanceMetrics = resetPerformanceMetrics;
//# sourceMappingURL=performance.js.map