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
exports.register = exports.businessMetrics = exports.metricsApp = void 0;
exports.metricsMiddleware = metricsMiddleware;
const prom_client_1 = __importStar(require("prom-client"));
const express_1 = __importDefault(require("express"));
const logger_1 = require("../utils/logger");
// Initialize registry and default metrics
const register = new prom_client_1.default.Registry();
exports.register = register;
prom_client_1.default.collectDefaultMetrics({ register });
// Register error metrics from logger
register.registerMetric(logger_1.errorMetrics.totalErrors);
register.registerMetric(logger_1.errorMetrics.errorRate);
register.registerMetric(logger_1.errorMetrics.logVolume);
// Define HTTP request metrics
const httpRequestDuration = new prom_client_1.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'code'],
    registers: [register]
});
const httpRequestCount = new prom_client_1.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'code'],
    registers: [register]
});
// Error rate specific metrics
const httpErrorCount = new prom_client_1.Counter({
    name: 'http_errors_total',
    help: 'Total number of HTTP errors (4xx and 5xx)',
    labelNames: ['method', 'route', 'code', 'error_type'],
    registers: [register]
});
const errorRateGauge = new prom_client_1.Gauge({
    name: 'current_error_rate',
    help: 'Current error rate percentage over time windows',
    labelNames: ['service', 'time_window'],
    registers: [register]
});
// Business logic errors
const businessErrors = new prom_client_1.Counter({
    name: 'business_logic_errors_total',
    help: 'Total number of business logic errors',
    labelNames: ['service', 'operation', 'error_category'],
    registers: [register]
});
// Custom business metrics
const customMetric = new prom_client_1.Counter({
    name: 'custom_business_metric',
    help: 'Custom business metric specific to Nen',
    registers: [register]
});
// WebSocket connection metrics
const websocketConnections = new prom_client_1.Gauge({
    name: 'websocket_connections_active',
    help: 'Number of active WebSocket connections',
    registers: [register]
});
const websocketErrors = new prom_client_1.Counter({
    name: 'websocket_errors_total',
    help: 'Total number of WebSocket errors',
    labelNames: ['error_type', 'event'],
    registers: [register]
});
// Express middleware to measure request durations and count
function metricsMiddleware(req, res, next) {
    const end = httpRequestDuration.startTimer();
    res.on('finish', () => {
        const labels = { method: req.method, route: req.route?.path || req.path, code: res.statusCode };
        // Track all requests
        httpRequestCount.inc(labels);
        end(labels);
        // Track HTTP errors (4xx and 5xx)
        if (res.statusCode >= 400) {
            const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
            httpErrorCount.inc({ ...labels, error_type: errorType });
        }
    });
    next();
}
// Calculate and update error rates periodically
class ErrorRateCalculator {
    constructor() {
        this.errorCounts = new Map();
        this.totalCounts = new Map();
        // Update error rates every 30 seconds
        setInterval(() => this.calculateRates(), 30000);
    }
    calculateRates() {
        const services = ['nen-backend']; // Add more services as needed
        const timeWindows = ['1m', '5m', '15m'];
        for (const service of services) {
            for (const window of timeWindows) {
                const errorCount = this.errorCounts.get(`${service}_${window}`) || 0;
                const totalCount = this.totalCounts.get(`${service}_${window}`) || 0;
                const rate = totalCount > 0 ? (errorCount / totalCount) * 100 : 0;
                errorRateGauge.set({ service, time_window: window }, rate);
                // Reset counters for next calculation
                this.errorCounts.set(`${service}_${window}`, 0);
                this.totalCounts.set(`${service}_${window}`, 0);
            }
        }
    }
    recordError(service = 'nen-backend') {
        const timeWindows = ['1m', '5m', '15m'];
        for (const window of timeWindows) {
            const key = `${service}_${window}`;
            this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
        }
    }
    recordRequest(service = 'nen-backend') {
        const timeWindows = ['1m', '5m', '15m'];
        for (const window of timeWindows) {
            const key = `${service}_${window}`;
            this.totalCounts.set(key, (this.totalCounts.get(key) || 0) + 1);
        }
    }
}
const errorRateCalculator = new ErrorRateCalculator();
// Enhanced metrics for business logic
const businessMetrics = {
    recordBusinessError: (service, operation, category) => {
        businessErrors.inc({ service, operation, error_category: category });
    },
    recordWebSocketConnection: (delta = 1) => {
        websocketConnections.inc(delta);
    },
    recordWebSocketError: (errorType, event) => {
        websocketErrors.inc({ error_type: errorType, event });
    },
    recordError: (service) => {
        errorRateCalculator.recordError(service);
    },
    recordRequest: (service) => {
        errorRateCalculator.recordRequest(service);
    }
};
exports.businessMetrics = businessMetrics;
// Health check endpoint
const healthCheck = {
    healthy: new prom_client_1.Gauge({
        name: 'app_health_status',
        help: 'Application health status (1 = healthy, 0 = unhealthy)',
        registers: [register]
    })
};
// Set initial health status
healthCheck.healthy.set(1);
// Expose metrics endpoint
const metricsApp = (0, express_1.default)();
exports.metricsApp = metricsApp;
metricsApp.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});
metricsApp.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
    });
});
//# sourceMappingURL=metrics.js.map