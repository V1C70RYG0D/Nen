/**
 * API Gateway Middleware
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import { config } from '../config';

// Rate limiting configuration
export const createRateLimiter = (windowMs: number = 15 * 60 * 1000, max: number = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too Many Requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
};

// Slow down middleware for progressive delays
export const createSlowDown = (windowMs: number = 15 * 60 * 1000, delayAfter: number = 50) => {
  return slowDown({
    windowMs,
    delayAfter,
    delayMs: 500, // 500ms delay after delayAfter requests
    maxDelayMs: 20000, // Maximum delay of 20 seconds
  });
};

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-eval'"], // Allow eval for Socket.IO
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", config.security.corsOrigin],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
});

// API versioning middleware
export const apiVersioning = (req: Request, res: Response, next: NextFunction) => {
  const acceptVersion = req.headers['accept-version'] || req.headers['api-version'];
  const urlVersion = req.url.match(/^\/api\/v(\d+)\//);

  if (urlVersion) {
    req.headers['api-version'] = urlVersion[1];
  } else if (acceptVersion) {
    req.headers['api-version'] = acceptVersion as string;
  } else {
    req.headers['api-version'] = '1'; // Default version
  }

  next();
};

// Request validation middleware
export const requestValidation = (req: Request, res: Response, next: NextFunction) => {
  // Validate content type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Content-Type must be application/json',
      });
    }
  }

  // Validate request size
  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > 10 * 1024 * 1024) { // 10MB limit
    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'Request payload exceeds maximum size limit',
    });
  }

  next();
};

// CORS middleware with dynamic origin validation
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  const allowedOrigins = config.security.corsOrigin.split(',');

  if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, API-Version');
  res.header('Access-Control-Allow-Credentials', config.security.corsCredentials.toString());

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
};

// Response time tracking
export const responseTimeTracking = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${duration}ms`);

    // Log slow requests
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.url} took ${duration}ms`);
    }
  });

  next();
};

// Request ID middleware for tracing
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] ||
                   req.headers['x-correlation-id'] ||
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  req.headers['x-request-id'] = requestId as string;
  res.setHeader('X-Request-ID', requestId);

  next();
};

// API Gateway middleware stack
export const apiGateway = [
  securityHeaders,
  corsMiddleware,
  requestId,
  responseTimeTracking,
  apiVersioning,
  requestValidation,
  createRateLimiter(config.security.rateLimitWindowMs, config.security.rateLimitMaxRequests),
  createSlowDown(),
];

export default apiGateway;
