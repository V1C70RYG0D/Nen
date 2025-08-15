/**
 * Comprehensive Logging Configuration

 *
 * This module provides structured logging with multiple levels,
 * contextual insights, and configurable outputs for different environments.
 */

const winston = require('winston');
const path = require('path');

// Custom log levels following RFC 5424
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// Color scheme for console output
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'grey'
};

winston.addColors(logColors);

// Environment-based configuration (GI #18 - No hardcoding)
const environment = process.env.NODE_ENV || 'development';
const logLevel = process.env.LOG_LEVEL || (environment === 'production' ? 'info' : 'debug');
const logFormat = process.env.LOG_FORMAT || (environment === 'production' ? 'json' : 'simple');

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({
    fillExcept: ['message', 'level', 'timestamp', 'label']
  }),
  winston.format.json()
);

// Human-readable format for development
const developmentFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, label, ...meta }) => {
    const labelString = label ? `[${label}] ` : '';
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} ${level}: ${labelString}${message}${metaString}`;
  })
);

// Security-focused format (removes sensitive data)
const secureFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    // Remove sensitive information (GI #27 - Data Privacy)
    const sanitized = { ...info };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization', 'cookie'];

    function sanitizeObject(obj) {
      if (typeof obj !== 'object' || obj === null) {return obj;}

      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    }

    const cleanInfo = sanitizeObject(sanitized);
    return JSON.stringify(cleanInfo);
  })
);

// Transport configurations based on environment
const transports = [];

// Console transport (always enabled for development)
if (environment !== 'production' || process.env.LOG_TO_CONSOLE === 'true') {
  transports.push(
    new winston.transports.Console({
      level: logLevel,
      format: logFormat === 'json' ? structuredFormat : developmentFormat,
      handleExceptions: true,
      handleRejections: true
    })
  );
}

// File transports for persistent logging
if (environment === 'production' || process.env.LOG_TO_FILE === 'true') {
  const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

  // Combined logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      level: logLevel,
      format: secureFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true
    })
  );

  // Error logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: secureFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    })
  );

  // HTTP logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'http.log'),
      level: 'http',
      format: secureFormat,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5,
      tailable: true
    })
  );
}

// External logging services (production)
if (environment === 'production') {
  // Sentry for error tracking
  if (process.env.SENTRY_DSN) {
    const SentryTransport = require('winston-sentry-raven-transport');
    transports.push(
      new SentryTransport({
        dsn: process.env.SENTRY_DSN,
        level: 'error',
        environment: environment,
        tags: {
          component: 'nen-platform'
        }
      })
    );
  }

  // Datadog logs
  if (process.env.DATADOG_API_KEY) {
    const DatadogTransport = require('datadog-winston');
    transports.push(
      new DatadogTransport({
        apiKey: process.env.DATADOG_API_KEY,
        hostname: process.env.HOSTNAME || 'nen-platform',
        service: 'nen-platform',
        ddsource: 'nodejs',
        ddtags: `env:${environment}`
      })
    );
  }
}

// Create logger instance
const logger = winston.createLogger({
  levels: logLevels,
  level: logLevel,
  format: structuredFormat,
  defaultMeta: {
    service: 'nen-platform',
    environment: environment,
    version: process.env.npm_package_version || '0.1.0'
  },
  transports: transports,
  exitOnError: false
});

// Enhanced logging methods with context
logger.logWithContext = function(level, message, context = {}) {
  this.log(level, message, {
    ...context,
    timestamp: new Date().toISOString(),
    pid: process.pid,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
};

// Performance logging helper
logger.logPerformance = function(operation, startTime, context = {}) {
  const duration = Date.now() - startTime;
  this.logWithContext('info', `Performance: ${operation}`, {
    ...context,
    operation,
    duration: `${duration}ms`,
    performanceMetric: true
  });
};

// Security event logging
logger.logSecurity = function(event, details = {}) {
  this.logWithContext('warn', `Security Event: ${event}`, {
    ...details,
    securityEvent: true,
    timestamp: new Date().toISOString(),
    userAgent: details.userAgent || 'unknown',
    ip: details.ip || 'unknown'
  });
};

// Business metrics logging
logger.logMetric = function(metric, value, tags = {}) {
  this.logWithContext('info', `Metric: ${metric}`, {
    metric,
    value,
    tags,
    metricEvent: true,
    timestamp: new Date().toISOString()
  });
};

// Error logging with stack trace and context
logger.logError = function(error, context = {}) {
  this.logWithContext('error', error.message || 'Unknown error', {
    ...context,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    errorEvent: true
  });
};

// Request logging middleware for Express
logger.requestMiddleware = function() {
  return (req, res, next) => {
    const startTime = Date.now();

    // Log request
    this.logWithContext('http', `${req.method} ${req.url}`, {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      requestId: req.id,
      httpEvent: 'request'
    });

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      this.logWithContext('http', `${req.method} ${req.url} ${res.statusCode}`, {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentLength: res.get('Content-Length'),
        requestId: req.id,
        httpEvent: 'response'
      });
    });

    next();
  };
};

// Graceful shutdown logging
process.on('SIGTERM', () => {
  logger.logWithContext('info', 'SIGTERM received, shutting down gracefully', {
    shutdownEvent: true
  });
});

process.on('SIGINT', () => {
  logger.logWithContext('info', 'SIGINT received, shutting down gracefully', {
    shutdownEvent: true
  });
});

// Unhandled error logging
process.on('unhandledRejection', (reason, promise) => {
  logger.logError(new Error(`Unhandled Rejection: ${reason}`), {
    promise: promise.toString(),
    unhandledRejection: true
  });
});

process.on('uncaughtException', (error) => {
  logger.logError(error, {
    uncaughtException: true,
    fatal: true
  });
});

module.exports = logger;
