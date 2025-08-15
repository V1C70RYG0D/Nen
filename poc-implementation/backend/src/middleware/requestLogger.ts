/**
 * Request Logger Middleware

 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';

// Extend Request interface to include correlation ID
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      startTime?: number;
    }
  }
}

/**
 * Request logger middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Generate correlation ID for request tracking
  req.correlationId = uuidv4();
  req.startTime = Date.now();

  // Skip logging for health checks in production
  if (req.path === '/health' && config.isProduction()) {
    return next();
  }

  // Log request start
  const requestInfo = {
    correlationId: req.correlationId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString()
  };

  console.log('Request started:', requestInfo);

  // Capture response finish event
  const originalSend = res.send;
  res.send = function(data?: any) {
    const responseTime = Date.now() - (req.startTime || Date.now());

    const responseInfo = {
      correlationId: req.correlationId,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('Content-Length') || Buffer.byteLength(data || ''),
      timestamp: new Date().toISOString()
    };

    console.log('Request completed:', responseInfo);

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Error logger middleware
 */
export function errorLogger(error: any, req: Request, res: Response, next: NextFunction): void {
  const errorInfo = {
    correlationId: req.correlationId,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    },
    timestamp: new Date().toISOString()
  };

  console.error('Request error:', errorInfo);
  next(error);
}
