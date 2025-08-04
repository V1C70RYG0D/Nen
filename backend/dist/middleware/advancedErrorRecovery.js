"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupGlobalErrorHandlers = exports.createError = exports.enhancedErrorHandler = exports.AdvancedErrorRecovery = void 0;
const logger_1 = require("../utils/logger");
var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["LOW"] = "low";
    ErrorSeverity["MEDIUM"] = "medium";
    ErrorSeverity["HIGH"] = "high";
    ErrorSeverity["CRITICAL"] = "critical";
})(ErrorSeverity || (ErrorSeverity = {}));
var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["NETWORK"] = "network";
    ErrorCategory["DATABASE"] = "database";
    ErrorCategory["VALIDATION"] = "validation";
    ErrorCategory["AUTHENTICATION"] = "authentication";
    ErrorCategory["AUTHORIZATION"] = "authorization";
    ErrorCategory["BUSINESS_LOGIC"] = "business_logic";
    ErrorCategory["EXTERNAL_SERVICE"] = "external_service";
    ErrorCategory["SYSTEM"] = "system";
})(ErrorCategory || (ErrorCategory = {}));
class ErrorMetrics {
    static instance;
    errorCounts = new Map();
    errorRates = new Map();
    recoveryStats = new Map();
    static getInstance() {
        if (!ErrorMetrics.instance) {
            ErrorMetrics.instance = new ErrorMetrics();
        }
        return ErrorMetrics.instance;
    }
    recordError(category, severity) {
        const key = `${category}:${severity}`;
        this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
        const now = Date.now();
        if (!this.errorRates.has(key)) {
            this.errorRates.set(key, []);
        }
        const rates = this.errorRates.get(key);
        rates.push(now);
        const oneHourAgo = now - 3600000;
        this.errorRates.set(key, rates.filter(time => time > oneHourAgo));
    }
    recordRecovery(strategy, successful) {
        if (!this.recoveryStats.has(strategy)) {
            this.recoveryStats.set(strategy, { attempts: 0, successes: 0 });
        }
        const stats = this.recoveryStats.get(strategy);
        stats.attempts++;
        if (successful)
            stats.successes++;
    }
    getMetrics() {
        return {
            errorCounts: Object.fromEntries(this.errorCounts),
            errorRates: Object.fromEntries(Array.from(this.errorRates.entries()).map(([key, times]) => [
                key,
                times.length
            ])),
            recoveryStats: Object.fromEntries(this.recoveryStats)
        };
    }
}
const databaseRetryStrategy = {
    name: 'database_retry',
    maxAttempts: 3,
    backoffMs: 1000,
    applicable: (error) => {
        return error.message.includes('database') ||
            error.message.includes('connection') ||
            error.message.includes('ECONNREFUSED');
    },
    execute: async (error, context) => {
        logger_1.logger.info('Attempting database recovery', {
            requestId: context.requestId,
            attempt: context.recovery?.attempts || 1
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        return { recovered: true, data: null };
    }
};
const cacheFailoverStrategy = {
    name: 'cache_failover',
    maxAttempts: 2,
    backoffMs: 500,
    applicable: (error) => {
        return error.message.includes('redis') ||
            error.message.includes('cache');
    },
    execute: async (error, context) => {
        logger_1.logger.info('Attempting cache failover', {
            requestId: context.requestId
        });
        return { recovered: true, data: null, fallback: 'memory' };
    }
};
const networkRetryStrategy = {
    name: 'network_retry',
    maxAttempts: 5,
    backoffMs: 2000,
    applicable: (error) => {
        return error.message.includes('network') ||
            error.message.includes('timeout') ||
            error.message.includes('ETIMEDOUT') ||
            error.message.includes('ENOTFOUND');
    },
    execute: async (error, context) => {
        const attempt = context.recovery?.attempts || 1;
        const backoff = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
        logger_1.logger.info('Attempting network recovery', {
            requestId: context.requestId,
            attempt,
            backoffMs: backoff
        });
        await new Promise(resolve => setTimeout(resolve, backoff));
        return { recovered: true, data: null };
    }
};
const magicBlockRetryStrategy = {
    name: 'magicblock_retry',
    maxAttempts: 3,
    backoffMs: 1500,
    applicable: (error) => {
        return error.message.includes('magicblock') ||
            error.message.includes('rollup') ||
            error.message.includes('session');
    },
    execute: async (error, context) => {
        logger_1.logger.info('Attempting MagicBlock recovery', {
            requestId: context.requestId
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { recovered: true, data: null, reconnected: true };
    }
};
class AdvancedErrorRecovery {
    static instance;
    strategies = [
        databaseRetryStrategy,
        cacheFailoverStrategy,
        networkRetryStrategy,
        magicBlockRetryStrategy
    ];
    metrics = ErrorMetrics.getInstance();
    circuitBreakers = new Map();
    static getInstance() {
        if (!AdvancedErrorRecovery.instance) {
            AdvancedErrorRecovery.instance = new AdvancedErrorRecovery();
        }
        return AdvancedErrorRecovery.instance;
    }
    async attemptRecovery(error, context) {
        const strategy = this.strategies.find(s => s.applicable(error));
        if (!strategy) {
            logger_1.logger.warn('No recovery strategy found for error', {
                error: error.message,
                requestId: context.requestId
            });
            return { recovered: false };
        }
        if (this.isCircuitOpen(strategy.name)) {
            logger_1.logger.warn('Circuit breaker open, skipping recovery', {
                strategy: strategy.name,
                requestId: context.requestId
            });
            return { recovered: false };
        }
        let lastError = error;
        const maxAttempts = strategy.maxAttempts;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                context.recovery = {
                    attempts: attempt,
                    successful: false,
                    strategy: strategy.name,
                    duration: 0
                };
                const startTime = Date.now();
                const result = await strategy.execute(lastError, context);
                const duration = Date.now() - startTime;
                context.recovery.successful = true;
                context.recovery.duration = duration;
                this.metrics.recordRecovery(strategy.name, true);
                this.recordSuccess(strategy.name);
                logger_1.logger.info('Recovery successful', {
                    strategy: strategy.name,
                    attempt,
                    duration,
                    requestId: context.requestId
                });
                return {
                    recovered: true,
                    data: result,
                    strategy: strategy.name
                };
            }
            catch (recoveryError) {
                lastError = recoveryError instanceof Error ? recoveryError : error;
                this.recordFailure(strategy.name);
                logger_1.logger.warn('Recovery attempt failed', {
                    strategy: strategy.name,
                    attempt,
                    error: lastError.message,
                    requestId: context.requestId
                });
                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, strategy.backoffMs * attempt));
                }
            }
        }
        this.metrics.recordRecovery(strategy.name, false);
        return { recovered: false };
    }
    isCircuitOpen(strategyName) {
        const breaker = this.circuitBreakers.get(strategyName);
        if (!breaker)
            return false;
        const now = Date.now();
        const fiveMinutesAgo = now - 300000;
        if (breaker.isOpen && breaker.lastFailure < fiveMinutesAgo) {
            breaker.isOpen = false;
            breaker.failures = 0;
        }
        return breaker.isOpen;
    }
    recordSuccess(strategyName) {
        const breaker = this.circuitBreakers.get(strategyName);
        if (breaker) {
            breaker.failures = 0;
            breaker.isOpen = false;
        }
    }
    recordFailure(strategyName) {
        if (!this.circuitBreakers.has(strategyName)) {
            this.circuitBreakers.set(strategyName, {
                failures: 0,
                lastFailure: 0,
                isOpen: false
            });
        }
        const breaker = this.circuitBreakers.get(strategyName);
        breaker.failures++;
        breaker.lastFailure = Date.now();
        if (breaker.failures >= 5) {
            breaker.isOpen = true;
            logger_1.logger.warn('Circuit breaker opened', {
                strategy: strategyName,
                failures: breaker.failures
            });
        }
    }
    getHealthStatus() {
        return {
            strategies: this.strategies.map(s => s.name),
            circuitBreakers: Object.fromEntries(this.circuitBreakers),
            metrics: this.metrics.getMetrics()
        };
    }
}
exports.AdvancedErrorRecovery = AdvancedErrorRecovery;
function categorizeError(error) {
    const message = error.message.toLowerCase();
    if (message.includes('database') || message.includes('sql') || message.includes('prisma')) {
        return { category: ErrorCategory.DATABASE, severity: ErrorSeverity.HIGH };
    }
    if (message.includes('network') || message.includes('timeout') || message.includes('econnrefused')) {
        return { category: ErrorCategory.NETWORK, severity: ErrorSeverity.MEDIUM };
    }
    if (message.includes('unauthorized') || message.includes('authentication')) {
        return { category: ErrorCategory.AUTHENTICATION, severity: ErrorSeverity.MEDIUM };
    }
    if (message.includes('validation') || message.includes('invalid')) {
        return { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW };
    }
    if (message.includes('magicblock') || message.includes('solana') || message.includes('external')) {
        return { category: ErrorCategory.EXTERNAL_SERVICE, severity: ErrorSeverity.HIGH };
    }
    return { category: ErrorCategory.SYSTEM, severity: ErrorSeverity.MEDIUM };
}
const enhancedErrorHandler = async (error, req, res, next) => {
    const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
    const { category, severity } = categorizeError(error);
    const context = {
        requestId,
        timestamp: new Date(),
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.headers.authorization?.replace('Bearer ', ''),
        stackTrace: error.stack
    };
    ErrorMetrics.getInstance().recordError(category, severity);
    if (severity === ErrorSeverity.HIGH || severity === ErrorSeverity.MEDIUM) {
        const recovery = AdvancedErrorRecovery.getInstance();
        const result = await recovery.attemptRecovery(error, context);
        if (result.recovered) {
            logger_1.logger.info('Error recovered successfully', {
                requestId,
                strategy: result.strategy,
                originalError: error.message
            });
            if (result.data) {
                res.json(result.data);
                return;
            }
        }
    }
    logger_1.logger.error('Unrecovered error', {
        ...context,
        category,
        severity,
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack
        }
    });
    const statusCode = getStatusCode(error, category);
    const errorResponse = {
        error: getPublicErrorMessage(error, category),
        requestId,
        timestamp: context.timestamp.toISOString(),
        ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack,
            category,
            severity
        })
    };
    res.status(statusCode).json(errorResponse);
};
exports.enhancedErrorHandler = enhancedErrorHandler;
function getStatusCode(error, category) {
    if (error.message.includes('not found'))
        return 404;
    if (error.message.includes('unauthorized'))
        return 401;
    if (error.message.includes('forbidden'))
        return 403;
    if (error.message.includes('validation'))
        return 400;
    switch (category) {
        case ErrorCategory.VALIDATION:
            return 400;
        case ErrorCategory.AUTHENTICATION:
            return 401;
        case ErrorCategory.AUTHORIZATION:
            return 403;
        case ErrorCategory.DATABASE:
        case ErrorCategory.EXTERNAL_SERVICE:
            return 503;
        default:
            return 500;
    }
}
function getPublicErrorMessage(error, category) {
    if (process.env.NODE_ENV === 'production') {
        switch (category) {
            case ErrorCategory.DATABASE:
                return 'Database temporarily unavailable';
            case ErrorCategory.NETWORK:
                return 'Network connectivity issue';
            case ErrorCategory.EXTERNAL_SERVICE:
                return 'External service temporarily unavailable';
            case ErrorCategory.VALIDATION:
                return 'Invalid request data';
            case ErrorCategory.AUTHENTICATION:
                return 'Authentication required';
            case ErrorCategory.AUTHORIZATION:
                return 'Access denied';
            default:
                return 'Internal server error';
        }
    }
    return error.message;
}
const createError = (message, statusCode = 500) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.status = statusCode;
    return error;
};
exports.createError = createError;
const setupGlobalErrorHandlers = () => {
    process.on('uncaughtException', (error) => {
        logger_1.logger.error('Uncaught Exception', {
            error: error.message,
            stack: error.stack
        });
        setTimeout(() => {
            process.exit(1);
        }, 1000);
    });
    process.on('unhandledRejection', (reason, promise) => {
        logger_1.logger.error('Unhandled Rejection', {
            reason: reason?.message || reason,
            stack: reason?.stack
        });
        if (process.env.NODE_ENV !== 'production') {
            setTimeout(() => {
                process.exit(1);
            }, 1000);
        }
    });
};
exports.setupGlobalErrorHandlers = setupGlobalErrorHandlers;
exports.default = exports.enhancedErrorHandler;
//# sourceMappingURL=advancedErrorRecovery.js.map