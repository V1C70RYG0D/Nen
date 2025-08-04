"use strict";
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
const performanceTracker = (req, res, next) => {
    const startTime = Date.now();
    res.setHeader('X-Response-Time-Target', '100ms');
    res.setHeader('X-Performance-Optimized', 'true');
    const originalEnd = res.end.bind(res);
    res.end = function (chunk, encoding, callback) {
        const responseTime = Date.now() - startTime;
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
        res.setHeader('X-Response-Time', `${responseTime}ms`);
        res.setHeader('X-Performance-Status', responseTime <= 100 ? 'OPTIMAL' : 'SLOW');
        if (metrics.requestCount % 100 === 0) {
            logger_1.logger.info('Performance metrics update', {
                totalRequests: metrics.requestCount,
                averageResponseTime: `${Math.round(metrics.averageResponseTime)}ms`,
                slowRequests: metrics.slowRequests,
                fastRequests: metrics.fastRequests,
                performanceRate: `${Math.round((metrics.fastRequests / metrics.requestCount) * 100)}%`
            });
        }
        return originalEnd(chunk, encoding, callback);
    };
    next();
};
exports.performanceTracker = performanceTracker;
exports.performanceCompression = (0, compression_1.default)({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression_1.default.filter(req, res);
    },
    level: 6,
    threshold: 1024,
});
const cacheOptimization = (req, res, next) => {
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
    if (req.path.startsWith('/api/')) {
        if (req.method === 'GET') {
            res.setHeader('Cache-Control', 'public, max-age=30');
        }
        else {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
    }
    next();
};
exports.cacheOptimization = cacheOptimization;
const memoryMonitoring = (req, res, next) => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    if (heapUsedMB > 500) {
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
const getPerformanceMetrics = () => {
    return { ...metrics };
};
exports.getPerformanceMetrics = getPerformanceMetrics;
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