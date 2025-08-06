"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceMonitor = exports.PerformanceMonitor = void 0;
const perf_hooks_1 = require("perf_hooks");
const prom = __importStar(require("prom-client"));
const events_1 = require("events");
const dotenv_1 = require("dotenv");
const path_1 = __importDefault(require("path"));
(0, dotenv_1.config)({ path: path_1.default.join(__dirname, '../../../config/game.env') });
// Initialize Prometheus registry
const register = new prom.Registry();
prom.collectDefaultMetrics({ register });
// Metrics definitions
const moveLatencyHistogram = new prom.Histogram({
    name: 'move_execution_latency_seconds',
    help: 'Time taken to execute game moves in seconds',
    labelNames: ['move_type', 'player_type'],
    buckets: [0.1, 0.5, 1, 2, 5]
});
const cachePerformanceHistogram = new prom.Histogram({
    name: 'cache_operation_duration_seconds',
    help: 'Duration of cache operations in seconds',
    labelNames: ['operation', 'cache_type'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5]
});
const aiPerformanceHistogram = new prom.Histogram({
    name: 'ai_calculation_duration_seconds',
    help: 'Time taken for AI move calculations in seconds',
    labelNames: ['personality', 'difficulty'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
});
const errorCounter = new prom.Counter({
    name: 'application_errors_total',
    help: 'Total number of application errors',
    labelNames: ['error_type', 'severity']
});
const activeUsersGauge = new prom.Gauge({
    name: 'active_users_count',
    help: 'Number of currently active users',
    labelNames: ['region']
});
const sessionDurationHistogram = new prom.Histogram({
    name: 'user_session_duration_seconds',
    help: 'Duration of user sessions in seconds',
    labelNames: ['user_type', 'region'],
    buckets: [60, 300, 900, 1800, 3600, 7200] // 1min to 2hours
});
// Register all metrics
register.registerMetric(moveLatencyHistogram);
register.registerMetric(cachePerformanceHistogram);
register.registerMetric(aiPerformanceHistogram);
register.registerMetric(errorCounter);
register.registerMetric(activeUsersGauge);
register.registerMetric(sessionDurationHistogram);
class PerformanceMonitor extends events_1.EventEmitter {
    constructor() {
        super();
        this.activeUsers = new Map();
        this.setupPeriodicMetrics();
    }
    static getInstance() {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }
    /**
     * Track move execution latency
     */
    trackMoveLatency(startTime, endTime, moveType, playerType) {
        const latency = (endTime - startTime) / 1000; // Convert to seconds
        moveLatencyHistogram
            .labels(moveType || 'unknown', playerType || 'human')
            .observe(latency);
        // Emit event for real-time monitoring
        this.emit('moveLatency', { latency, moveType, playerType });
        // Log performance issues
        if (latency > 2) {
            console.warn(`High move latency detected: ${latency}s for ${moveType} by ${playerType}`);
            errorCounter.labels('performance', 'warning').inc();
        }
    }
    /**
     * Track cache operation performance
     */
    trackCachePerformance(operation, duration, cacheType) {
        const durationSeconds = duration / 1000; // Convert to seconds
        cachePerformanceHistogram
            .labels(operation, cacheType || 'default')
            .observe(durationSeconds);
        // Emit event for real-time monitoring
        this.emit('cachePerformance', { operation, duration: durationSeconds, cacheType });
        // Log slow cache operations
        if (durationSeconds > 0.1) {
            console.warn(`Slow cache operation: ${operation} took ${durationSeconds}s`);
            errorCounter.labels('performance', 'warning').inc();
        }
    }
    /**
     * Track AI move calculation performance
     */
    trackAIPerformance(personality, moveTime, difficulty) {
        const moveTimeSeconds = moveTime / 1000; // Convert to seconds
        aiPerformanceHistogram
            .labels(personality, difficulty || 'medium')
            .observe(moveTimeSeconds);
        // Emit event for real-time monitoring
        this.emit('aiPerformance', { personality, moveTime: moveTimeSeconds, difficulty });
        // Log slow AI calculations
        if (moveTimeSeconds > 5) {
            console.warn(`Slow AI calculation: ${personality} took ${moveTimeSeconds}s`);
            errorCounter.labels('performance', 'warning').inc();
        }
    }
    /**
     * Track user session start
     */
    trackUserSessionStart(userId, region) {
        this.activeUsers.set(userId, {
            region,
            sessionStart: perf_hooks_1.performance.now()
        });
        // Update active users metric
        this.updateActiveUsersMetric();
        this.emit('userSessionStart', { userId, region });
    }
    /**
     * Track user session end
     */
    trackUserSessionEnd(userId, userType) {
        const session = this.activeUsers.get(userId);
        if (session) {
            const sessionDuration = (perf_hooks_1.performance.now() - session.sessionStart) / 1000;
            sessionDurationHistogram
                .labels(userType || 'regular', session.region)
                .observe(sessionDuration);
            this.activeUsers.delete(userId);
            this.updateActiveUsersMetric();
            this.emit('userSessionEnd', { userId, duration: sessionDuration, region: session.region });
        }
    }
    /**
     * Track application errors
     */
    trackError(errorType, severity = 'medium') {
        errorCounter.labels(errorType, severity).inc();
        this.emit('error', { errorType, severity });
        // Log critical errors immediately
        if (severity === 'critical') {
            console.error(`Critical error detected: ${errorType}`);
        }
    }
    /**
     * Get geographic performance distribution
     */
    getGeographicDistribution() {
        const distribution = {};
        for (const [userId, session] of this.activeUsers) {
            distribution[session.region] = (distribution[session.region] || 0) + 1;
        }
        return distribution;
    }
    /**
     * Get current metrics for dashboard
     */
    async getCurrentMetrics() {
        return register.metrics();
    }
    /**
     * Get performance summary
     */
    getPerformanceSummary() {
        return {
            activeUsers: this.activeUsers.size,
            geographicDistribution: this.getGeographicDistribution(),
            timestamp: new Date().toISOString()
        };
    }
    /**
     * Setup periodic metrics collection
     */
    setupPeriodicMetrics() {
        setInterval(() => {
            this.updateActiveUsersMetric();
        }, parseInt(process.env.ACTIVE_USERS_UPDATE_INTERVAL_MS) || 30000);
        setInterval(() => {
            this.emit('performanceSummary', this.getPerformanceSummary());
        }, parseInt(process.env.PERFORMANCE_SUMMARY_INTERVAL_MS) || 60000);
    }
    /**
     * Update active users metric by region
     */
    updateActiveUsersMetric() {
        const regionCounts = {};
        for (const [userId, session] of this.activeUsers) {
            regionCounts[session.region] = (regionCounts[session.region] || 0) + 1;
        }
        // Reset all gauges first
        activeUsersGauge.reset();
        // Set current values
        for (const [region, count] of Object.entries(regionCounts)) {
            activeUsersGauge.labels(region).set(count);
        }
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
// Export singleton instance
exports.performanceMonitor = PerformanceMonitor.getInstance();
//# sourceMappingURL=performance-monitor.js.map