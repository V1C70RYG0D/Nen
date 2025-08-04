/**
 * Enhanced Winston Logger with Error Rate Monitoring
 * Structured logging with Prometheus metrics integration
 */

import winston from 'winston';
import { Counter, Histogram } from 'prom-client';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Prometheus metrics for error tracking
export const errorMetrics = {
  totalErrors: new Counter({
    name: 'application_errors_total',
    help: 'Total number of application errors',
    labelNames: ['level', 'service', 'endpoint', 'error_type']
  }),

  errorRate: new Histogram({
    name: 'application_error_rate',
    help: 'Application error rate per time window',
    labelNames: ['service', 'time_window'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
  }),

  logVolume: new Counter({
    name: 'log_entries_total',
    help: 'Total number of log entries by level',
    labelNames: ['level', 'service']
  })
};

// Custom format for structured logging
const customFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ level, message, timestamp, service, endpoint, error_type, stack, ...meta }) => {
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
  })
);

export class EnhancedLogger {
  private winston: winston.Logger;
  private service: string;

  constructor(service: string = 'nen-backend') {
    this.service = service;

    this.winston = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: customFormat,
      defaultMeta: { service: this.service },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),

        // File transport for all logs
        new winston.transports.File({
          filename: path.join(logsDir, 'application.log'),
          maxsize: 10485760, // 10MB
          maxFiles: 5
        }),

        // Separate file for errors
        new winston.transports.File({
          filename: path.join(logsDir, 'errors.log'),
          level: 'error',
          maxsize: 10485760, // 10MB
          maxFiles: 10
        }),

        // Separate file for warnings
        new winston.transports.File({
          filename: path.join(logsDir, 'warnings.log'),
          level: 'warn',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      ]
    });
  }

  private updateMetrics(level: string, endpoint?: string, error_type?: string): void {
    // Update log volume metrics
    errorMetrics.logVolume.inc({ level, service: this.service });

    // Update error metrics for warnings and errors
    if (level === 'error' || level === 'warn') {
      errorMetrics.totalErrors.inc({
        level,
        service: this.service,
        endpoint: endpoint || 'unknown',
        error_type: error_type || 'application_error'
      });
    }
  }

  debug(message: string, meta?: any): void {
    this.winston.debug(message, meta);
    this.updateMetrics('debug');
  }

  info(message: string, meta?: any): void {
    this.winston.info(message, meta);
    this.updateMetrics('info');
  }

  warn(message: string, meta?: any): void {
    const endpoint = meta?.endpoint;
    const error_type = meta?.error_type || 'warning';

    this.winston.warn(message, meta);
    this.updateMetrics('warn', endpoint, error_type);
  }

  error(message: string, error?: Error | any, meta?: any): void {
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
  apiError(endpoint: string, error: Error, meta?: any): void {
    this.error(`API Error at ${endpoint}`, error, {
      ...meta,
      endpoint,
      error_type: 'api_error'
    });
  }

  databaseError(operation: string, error: Error, meta?: any): void {
    this.error(`Database Error during ${operation}`, error, {
      ...meta,
      operation,
      error_type: 'database_error'
    });
  }

  authError(action: string, error: Error, meta?: any): void {
    this.error(`Authentication Error during ${action}`, error, {
      ...meta,
      action,
      error_type: 'auth_error'
    });
  }

  validationError(field: string, value: any, reason: string, meta?: any): void {
    this.warn(`Validation Error for field ${field}`, {
      ...meta,
      field,
      value,
      reason,
      error_type: 'validation_error'
    });
  }

  // Method to get current error rate
  recordErrorRate(timeWindow: string, rate: number): void {
    errorMetrics.errorRate.observe(
      { service: this.service, time_window: timeWindow },
      rate
    );
  }
}

// Export default logger instance
export const logger = new EnhancedLogger();

// Export logger factory for different services
export const createLogger = (service: string) => new EnhancedLogger(service);
