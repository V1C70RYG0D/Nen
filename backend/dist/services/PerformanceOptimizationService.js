"use strict";
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
class PerformanceOptimizationService {
    config;
    metrics;
    responseTimes = [];
    startTime;
    constructor(config) {
        this.config = {
            enableCompression: true,
            enableClustering: false,
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
    applyOptimizations(app) {
        if (this.config.enableCompression) {
            app.use((0, compression_1.default)({
                level: this.config.compressionLevel,
                threshold: 1024,
                filter: (req, res) => {
                    if (req.headers['x-no-compression']) {
                        return false;
                    }
                    return compression_1.default.filter(req, res);
                }
            }));
            logger_1.logger.info('Response compression enabled for performance optimization');
        }
        if (this.config.enableRequestOptimization) {
            app.use(this.requestOptimizationMiddleware.bind(this));
        }
        app.use(this.responseTimeMiddleware.bind(this));
        app.use(this.memoryOptimizationMiddleware.bind(this));
        logger_1.logger.info('All performance optimizations applied to Express application');
    }
    requestOptimizationMiddleware(req, res, next) {
        const startTime = perf_hooks_1.performance.now();
        res.setHeader('X-Powered-By', 'Nen-Platform-Optimized');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        if (req.path.startsWith('/api/')) {
            res.setHeader('Cache-Control', 'public, max-age=60');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
        }
        if (req.path.includes('/game/move') || req.path.includes('/game/match')) {
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('X-Game-API', 'true');
            if (req.method === 'POST' && req.headers['content-type']?.includes('json')) {
                req.on('data', chunk => {
                    try {
                        req.body = JSON.parse(chunk.toString());
                    }
                    catch (error) {
                    }
                });
            }
        }
        req.optimizationStartTime = startTime;
        next();
    }
    responseTimeMiddleware(req, res, next) {
        const startTime = perf_hooks_1.performance.now();
        res.on('finish', () => {
            const responseTime = perf_hooks_1.performance.now() - startTime;
            this.recordResponseTime(responseTime);
            if (responseTime > 100) {
                logger_1.logger.warn(`Slow response detected: ${req.method} ${req.path} - ${responseTime.toFixed(2)}ms`);
            }
            if (req.path.includes('/game/move') && responseTime > 50) {
                logger_1.logger.error(`Game move API exceeded 50ms target: ${responseTime.toFixed(2)}ms - ${req.path}`);
            }
        });
        next();
    }
    memoryOptimizationMiddleware(req, res, next) {
        const originalEnd = res.end.bind(res);
        res.end = (chunk, encoding, cb) => {
            delete req.optimizationStartTime;
            delete req.cachedResults;
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
    recordResponseTime(responseTime) {
        this.responseTimes.push(responseTime);
        if (this.responseTimes.length > 1000) {
            this.responseTimes = this.responseTimes.slice(-1000);
        }
        this.updateMetrics();
    }
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
        const memUsage = process.memoryUsage();
        this.metrics.memoryUsage = memUsage.heapUsed / 1024 / 1024;
    }
    getMetrics() {
        this.updateMetrics();
        return { ...this.metrics };
    }
    getPerformanceStatus() {
        const metrics = this.getMetrics();
        const recommendations = [];
        let status = 'optimal';
        if (metrics.responseTimeP95 > 100) {
            status = 'critical';
            recommendations.push('API response time exceeds 100ms target');
        }
        else if (metrics.responseTimeP95 > 85) {
            status = 'degraded';
            recommendations.push('API response time approaching 100ms limit');
        }
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
    optimizeGarbageCollection() {
        if (typeof global.gc === 'function') {
            setInterval(() => {
                const memUsage = process.memoryUsage();
                const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
                if (heapUsedMB > 100 && global.gc) {
                    global.gc();
                    logger_1.logger.debug('Garbage collection triggered due to high memory usage');
                }
            }, 30000);
            logger_1.logger.info('Garbage collection optimization enabled');
        }
        else {
            logger_1.logger.warn('Garbage collection not available. Run with --expose-gc flag for optimization');
        }
    }
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
            const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
            if (heapUsedMB > 512) {
                logger_1.logger.warn(`High memory usage detected: ${heapUsedMB.toFixed(2)}MB`);
            }
        }, 60000);
        logger_1.logger.info('Memory monitoring started');
    }
    static initializeClustering() {
        if (cluster_1.default.isMaster && process.env.NODE_ENV === 'production') {
            const numCPUs = os_1.default.cpus().length;
            logger_1.logger.info(`Master process ${process.pid} is running`);
            logger_1.logger.info(`Forking ${numCPUs} workers for optimal performance`);
            for (let i = 0; i < numCPUs; i++) {
                cluster_1.default.fork();
            }
            cluster_1.default.on('exit', (worker, code, signal) => {
                logger_1.logger.warn(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
                logger_1.logger.info('Starting a new worker');
                cluster_1.default.fork();
            });
            return true;
        }
        return false;
    }
}
exports.PerformanceOptimizationService = PerformanceOptimizationService;
exports.performanceOptimizer = new PerformanceOptimizationService({
    enableCompression: true,
    enableRequestOptimization: true,
    enableResponseCaching: true,
    gcOptimization: process.env.NODE_ENV === 'development',
    memoryMonitoring: true
});
//# sourceMappingURL=PerformanceOptimizationService.js.map