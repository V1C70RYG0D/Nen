"use strict";
/**
 * Enhanced Winston Logger with Error Rate Monitoring
 * Structured logging with Prometheus metrics integration
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = exports.logger = exports.EnhancedLogger = exports.errorMetrics = void 0;
const winston_1 = __importDefault(require("winston"));
const prom_client_1 = require("prom-client");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Ensure logs directory exists
const logsDir = path_1.default.join(process.cwd(), 'logs');
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
}
// Prometheus metrics for error tracking
exports.errorMetrics = {
    totalErrors: new prom_client_1.Counter({
        name: 'application_errors_total',
        help: 'Total number of application errors',
        labelNames: ['level', 'service', 'endpoint', 'error_type']
    }),
    errorRate: new prom_client_1.Histogram({
        name: 'application_error_rate',
        help: 'Application error rate per time window',
        labelNames: ['service', 'time_window'],
        buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
    }),
    logVolume: new prom_client_1.Counter({
        name: 'log_entries_total',
        help: 'Total number of log entries by level',
        labelNames: ['level', 'service']
    })
};
// Custom format for structured logging
const customFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.printf(({ level, message, timestamp, service, endpoint, error_type, stack, ...meta }) => {
    const logEntry = {
        timestamp,
        level,
        service: service || 'nen-backend',
        message,
        ...(endpoint && { endpoint }),
        ...(error_type && { error_type }),
        ...(stack && { stack }),
        ...meta
    };
    return JSON.stringify(logEntry);
}));
class EnhancedLogger {
    constructor(service = 'nen-backend') {
        this.service = service;
        this.winston = winston_1.default.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: customFormat,
            defaultMeta: { service: this.service },
            transports: [
                // Console transport for development
                new winston_1.default.transports.Console({
                    format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
                }),
                // File transport for all logs
                new winston_1.default.transports.File({
                    filename: path_1.default.join(logsDir, 'application.log'),
                    maxsize: 10485760, // 10MB
                    maxFiles: 5
                }),
                // Separate file for errors
                new winston_1.default.transports.File({
                    filename: path_1.default.join(logsDir, 'errors.log'),
                    level: 'error',
                    maxsize: 10485760, // 10MB
                    maxFiles: 10
                }),
                // Separate file for warnings
                new winston_1.default.transports.File({
                    filename: path_1.default.join(logsDir, 'warnings.log'),
                    level: 'warn',
                    maxsize: 5242880, // 5MB
                    maxFiles: 5
                })
            ]
        });
    }
    updateMetrics(level, endpoint, error_type) {
        // Update log volume metrics
        exports.errorMetrics.logVolume.inc({ level, service: this.service });
        // Update error metrics for warnings and errors
        if (level === 'error' || level === 'warn') {
            exports.errorMetrics.totalErrors.inc({
                level,
                service: this.service,
                endpoint: endpoint || 'unknown',
                error_type: error_type || 'application_error'
            });
        }
    }
    debug(message, meta) {
        this.winston.debug(message, meta);
        this.updateMetrics('debug');
    }
    info(message, meta) {
        this.winston.info(message, meta);
        this.updateMetrics('info');
    }
    warn(message, meta) {
        const endpoint = meta?.endpoint;
        const error_type = meta?.error_type || 'warning';
        this.winston.warn(message, meta);
        this.updateMetrics('warn', endpoint, error_type);
    }
    error(message, error, meta) {
        const endpoint = meta?.endpoint;
        const error_type = meta?.error_type || (error?.name || 'application_error');
        const logMeta = {
            ...meta,
            ...(error && {
                error_name: error.name,
                error_message: error.message,
                stack: error.stack
            })
        };
        this.winston.error(message, logMeta);
        this.updateMetrics('error', endpoint, error_type);
    }
    // Helper methods for common error scenarios
    apiError(endpoint, error, meta) {
        this.error(`API Error at ${endpoint}`, error, {
            ...meta,
            endpoint,
            error_type: 'api_error'
        });
    }
    databaseError(operation, error, meta) {
        this.error(`Database Error during ${operation}`, error, {
            ...meta,
            operation,
            error_type: 'database_error'
        });
    }
    authError(action, error, meta) {
        this.error(`Authentication Error during ${action}`, error, {
            ...meta,
            action,
            error_type: 'auth_error'
        });
    }
    validationError(field, value, reason, meta) {
        this.warn(`Validation Error for field ${field}`, {
            ...meta,
            field,
            value,
            reason,
            error_type: 'validation_error'
        });
    }
    // Method to get current error rate
    recordErrorRate(timeWindow, rate) {
        exports.errorMetrics.errorRate.observe({ service: this.service, time_window: timeWindow }, rate);
    }
}
exports.EnhancedLogger = EnhancedLogger;
// Export default logger instance
exports.logger = new EnhancedLogger();
// Export logger factory for different services
const createLogger = (service) => new EnhancedLogger(service);
exports.createLogger = createLogger;
//# sourceMappingURL=logger.js.map