"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceOptimizer = exports.PerformanceOptimizationService = void 0;
const compression_1 = __importDefault(require("compression"));
const cluster_1 = __importDefault(require("cluster"));
const os_1 = __importDefault(require("os"));
const perf_hooks_1 = require("perf_hooks");
const logger_1 = require("../utils/logger");
// ==========================================
// PERFORMANCE OPTIMIZATION SERVICE
// ==========================================
class PerformanceOptimizationService {
    constructor(config) {
        this.responseTimes = [];
        this.config = {
            enableCompression: true,
            enableClustering: false, // Disabled for POC to avoid complexity
            enableResponseCaching: true,
            enableRequestOptimization: true,
            maxRequestSize: '1mb',
            compressionLevel: 6,
            gcOptimization: true,
            memoryMonitoring: true,
            ...config
        };
        this.startTime = perf_hooks_1.performance.now();
        this.metrics = this.initializeMetrics();
        if (this.config.gcOptimization) {
            this.optimizeGarbageCollection();
        }
        if (this.config.memoryMonitoring) {
            this.startMemoryMonitoring();
        }
        logger_1.logger.info('Performance Optimization Service initialized with advanced optimizations');
    }
    initializeMetrics() {
        return {
            responseTimeP95: 0,
            responseTimeP99: 0,
            averageResponseTime: 0,
            requestsPerSecond: 0,
            memoryUsage: 0,
            cpuUsage: 0,
            errorRate: 0,
            uptime: 0
        };
    }
    // ==========================================
    // EXPRESS MIDDLEWARE OPTIMIZATIONS
    // ==========================================
    /**
     * Apply performance optimizations to Express app
     */
    applyOptimizations(app) {
        // Enable compression for faster response times
        if (this.config.enableCompression) {
            app.use((0, compression_1.default)({
                level: this.config.compressionLevel,
                threshold: 1024, // Only compress responses larger than 1KB
                filter: (req, res) => {
                    // Don't compress if the response is already compressed
                    if (req.headers['x-no-compression']) {
                        return false;
                    }
                    // Fallback to standard filter function
                    return compression_1.default.filter(req, res);
                }
            }));
            logger_1.logger.info('Response compression enabled for performance optimization');
        }
        // Request optimization middleware
        if (this.config.enableRequestOptimization) {
            app.use(this.requestOptimizationMiddleware.bind(this));
        }
        // Response time tracking middleware
        app.use(this.responseTimeMiddleware.bind(this));
        // Memory usage optimization
        app.use(this.memoryOptimizationMiddleware.bind(this));
        logger_1.logger.info('All performance optimizations applied to Express application');
    }
    /**
     * Request optimization middleware
     * Optimizes incoming requests for faster processing
     */
    requestOptimizationMiddleware(req, res, next) {
        const startTime = perf_hooks_1.performance.now();
        // Set optimization headers
        res.setHeader('X-Powered-By', 'Nen-Platform-Optimized');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        // Optimize response for common API responses
        if (req.path.startsWith('/api/')) {
            res.setHeader('Cache-Control', 'public, max-age=60'); // 1 minute cache for API
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
        }
        // Game move API optimization (Critical: <50ms target)
        if (req.path.includes('/game/move') || req.path.includes('/game/match')) {
            res.setHeader('Cache-Control', 'no-cache'); // Game data should be fresh
            res.setHeader('X-Game-API', 'true');
            // Pre-parse JSON for game requests
            if (req.method === 'POST' && req.headers['content-type']?.includes('json')) {
                req.on('data', chunk => {
                    try {
                        req.body = JSON.parse(chunk.toString());
                    }
                    catch (error) {
                        // Will be handled by express.json() middleware
                    }
                });
            }
        }
        req.optimizationStartTime = startTime;
        next();
    }
    /**
     * Response time tracking middleware
     * Tracks and logs response times for performance monitoring
     */
    responseTimeMiddleware(req, res, next) {
        const startTime = perf_hooks_1.performance.now();
        res.on('finish', () => {
            const responseTime = perf_hooks_1.performance.now() - startTime;
            this.recordResponseTime(responseTime);
            // Log slow responses for optimization
            if (responseTime > 100) {
                logger_1.logger.warn(`Slow response detected: ${req.method} ${req.path} - ${responseTime.toFixed(2)}ms`);
            }
            // Critical game move performance tracking
            if (req.path.includes('/game/move') && responseTime > 50) {
                logger_1.logger.error(`Game move API exceeded 50ms target: ${responseTime.toFixed(2)}ms - ${req.path}`);
            }
        });
        next();
    }
    /**
     * Memory optimization middleware
     * Optimizes memory usage during request processing
     */
    memoryOptimizationMiddleware(req, res, next) {
        // Set response end handler to clean up resources
        const originalEnd = res.end.bind(res);
        res.end = (chunk, encoding, cb) => {
            // Clean up request-specific resources
            delete req.optimizationStartTime;
            delete req.cachedResults;
            // Force garbage collection for heavy operations (in development)
            if (process.env.NODE_ENV === 'development' && global.gc) {
                setImmediate(() => {
                    if (global.gc) {
                        global.gc();
                    }
                });
            }
            return originalEnd(chunk, encoding, cb);
        };
        next();
    }
    // ==========================================
    // PERFORMANCE MONITORING
    // ==========================================
    /**
     * Record response time for metrics calculation
     */
    recordResponseTime(responseTime) {
        this.responseTimes.push(responseTime);
        // Keep only last 1000 response times for memory efficiency
        if (this.responseTimes.length > 1000) {
            this.responseTimes = this.responseTimes.slice(-1000);
        }
        this.updateMetrics();
    }
    /**
     * Update performance metrics
     */
    updateMetrics() {
        if (this.responseTimes.length === 0)
            return;
        const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
        const p95Index = Math.floor(sortedTimes.length * 0.95);
        const p99Index = Math.floor(sortedTimes.length * 0.99);
        this.metrics.responseTimeP95 = sortedTimes[p95Index] || 0;
        this.metrics.responseTimeP99 = sortedTimes[p99Index] || 0;
        this.metrics.averageResponseTime = sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length;
        this.metrics.uptime = (perf_hooks_1.performance.now() - this.startTime) / 1000;
        // Update memory usage
        const memUsage = process.memoryUsage();
        this.metrics.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB
    }
    /**
     * Get current performance metrics
     */
    getMetrics() {
        this.updateMetrics();
        return { ...this.metrics };
    }
    /**
     * Get performance status for health checks
     */
    getPerformanceStatus() {
        const metrics = this.getMetrics();
        const recommendations = [];
        let status = 'optimal';
        // Check API latency targets (POC Master Plan: <100ms)
        if (metrics.responseTimeP95 > 100) {
            status = 'critical';
            recommendations.push('API response time exceeds 100ms target');
        }
        else if (metrics.responseTimeP95 > 85) {
            status = 'degraded';
            recommendations.push('API response time approaching 100ms limit');
        }
        // Check memory usage
        if (metrics.memoryUsage > 512) {
            status = 'critical';
            recommendations.push('High memory usage detected');
        }
        else if (metrics.memoryUsage > 256) {
            status = 'degraded';
            recommendations.push('Elevated memory usage');
        }
        return { status, metrics, recommendations };
    }
    // ==========================================
    // GARBAGE COLLECTION OPTIMIZATION
    // ==========================================
    /**
     * Optimize garbage collection for better performance
     */
    optimizeGarbageCollection() {
        // Expose global GC if available
        if (typeof global.gc === 'function') {
            // Schedule periodic garbage collection in low-usage periods
            setInterval(() => {
                const memUsage = process.memoryUsage();
                const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
                // Trigger GC if memory usage is high
                if (heapUsedMB > 100 && global.gc) {
                    global.gc();
                    logger_1.logger.debug('Garbage collection triggered due to high memory usage');
                }
            }, 30000); // Every 30 seconds
            logger_1.logger.info('Garbage collection optimization enabled');
        }
        else {
            logger_1.logger.warn('Garbage collection not available. Run with --expose-gc flag for optimization');
        }
    }
    /**
     * Start memory monitoring
     */
    startMemoryMonitoring() {
        setInterval(() => {
            const memUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            logger_1.logger.debug('Memory usage:', {
                heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
                heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
                external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`,
                rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`
            });
            // Alert on high memory usage
            const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
            if (heapUsedMB > 512) {
                logger_1.logger.warn(`High memory usage detected: ${heapUsedMB.toFixed(2)}MB`);
            }
        }, 60000); // Every minute
        logger_1.logger.info('Memory monitoring started');
    }
    // ==========================================
    // CLUSTERING SUPPORT (Future Enhancement)
    // ==========================================
    /**
     * Initialize clustering for multi-core performance
     * Note: Disabled in POC for simplicity
     */
    static initializeClustering() {
        if (cluster_1.default.isMaster && process.env.NODE_ENV === 'production') {
            const numCPUs = os_1.default.cpus().length;
            logger_1.logger.info(`Master process ${process.pid} is running`);
            logger_1.logger.info(`Forking ${numCPUs} workers for optimal performance`);
            // Fork workers
            for (let i = 0; i < numCPUs; i++) {
                cluster_1.default.fork();
            }
            cluster_1.default.on('exit', (worker, code, signal) => {
                logger_1.logger.warn(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
                logger_1.logger.info('Starting a new worker');
                cluster_1.default.fork();
            });
            return true; // Master process
        }
        return false; // Worker process or non-production
    }
}
exports.PerformanceOptimizationService = PerformanceOptimizationService;
// ==========================================
// EXPORT SINGLETON INSTANCE
// ==========================================
exports.performanceOptimizer = new PerformanceOptimizationService({
    enableCompression: true,
    enableRequestOptimization: true,
    enableResponseCaching: true,
    gcOptimization: process.env.NODE_ENV === 'development',
    memoryMonitoring: true
});
//# sourceMappingURL=PerformanceOptimizationService.js.map