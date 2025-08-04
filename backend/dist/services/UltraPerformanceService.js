"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UltraPerformanceService = void 0;
const perf_hooks_1 = require("perf_hooks");
const logger_1 = require("../utils/logger");
class UltraPerformanceService {
    responseCache = new Map();
    requestPool = [];
    constructor() {
        this.initializeOptimizations();
        logger_1.logger.info('Ultra Performance Service initialized for <100ms latency target');
    }
    initializeOptimizations() {
        this.preWarmCache();
        setInterval(() => this.cleanupRequestPool(), 10000);
        setInterval(() => this.cleanupCache(), 30000);
    }
    preWarmCache() {
        const commonResponses = [
            { path: '/health', data: { status: 'healthy' } },
            { path: '/api/ai/agents', data: [] }
        ];
        commonResponses.forEach(item => {
            this.responseCache.set(item.path, {
                data: item.data,
                timestamp: Date.now(),
                ttl: 60000
            });
        });
        logger_1.logger.info('Response cache pre-warmed for common endpoints');
    }
    applyUltraOptimizations(app) {
        app.use((req, res, next) => {
            const startTime = perf_hooks_1.performance.now();
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Keep-Alive', 'timeout=5, max=1000');
            if (req.method === 'GET') {
                const cacheKey = req.path + JSON.stringify(req.query);
                const cached = this.responseCache.get(cacheKey);
                if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
                    res.setHeader('X-Cache', 'HIT');
                    res.setHeader('X-Response-Time', `${(perf_hooks_1.performance.now() - startTime).toFixed(2)}ms`);
                    return res.json(cached.data);
                }
                res.setHeader('X-Cache', 'MISS');
            }
            return next();
        });
        app.use((req, res, next) => {
            if (req.method !== 'GET')
                return next();
            const originalJson = res.json.bind(res);
            res.json = (data) => {
                if (res.statusCode === 200) {
                    const cacheKey = req.path + JSON.stringify(req.query);
                    this.responseCache.set(cacheKey, {
                        data,
                        timestamp: Date.now(),
                        ttl: this.getTTL(req.path)
                    });
                }
                return originalJson(data);
            };
            return next();
        });
        app.use((req, res, next) => {
            if (req.headers['content-type']?.includes('application/json')) {
                if (req.headers['content-length'] && parseInt(req.headers['content-length']) < 1024) {
                    res.setHeader('X-Fast-Parse', 'true');
                }
            }
            if (req.path.includes('/game/')) {
                res.setHeader('X-Game-Optimized', 'true');
                res.setHeader('Cache-Control', 'no-store');
                res.setHeader('Pragma', 'no-cache');
            }
            return next();
        });
        logger_1.logger.info('Ultra performance optimizations applied to Express application');
    }
    getTTL(path) {
        if (path === '/health')
            return 30000;
        if (path.includes('/api/ai/agents'))
            return 60000;
        if (path.includes('/api/match'))
            return 10000;
        return 30000;
    }
    cleanupCache() {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, value] of this.responseCache.entries()) {
            if (now - value.timestamp > value.ttl) {
                this.responseCache.delete(key);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            logger_1.logger.debug(`Cleaned ${cleaned} expired cache entries`);
        }
    }
    cleanupRequestPool() {
        this.requestPool = this.requestPool.filter(req => Date.now() - req.timestamp < 60000);
    }
    getStats() {
        return {
            cacheSize: this.responseCache.size,
            cacheHitRate: 0,
            requestPoolSize: this.requestPool.length
        };
    }
}
exports.UltraPerformanceService = UltraPerformanceService;
//# sourceMappingURL=UltraPerformanceService.js.map