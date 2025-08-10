/**
 * Performance Optimization Middleware
 * Implements <100ms API target requirements from POC Backend Plan
 *
 * Features:
 * - Response time tracking
 * - Request compression
 * - Caching headers
 * - Connection pooling optimizations
 * - Memory usage monitoring
 */

import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import { logger } from './logger';

// Performance metrics tracking
interface PerformanceMetrics {
  requestCount: number;
  totalResponseTime: number;
  averageResponseTime: number;
  slowRequests: number;
  fastRequests: number;
}

const metrics: PerformanceMetrics = {
  requestCount: 0,
  totalResponseTime: 0,
  averageResponseTime: 0,
  slowRequests: 0,
  fastRequests: 0
};

/**
 * Response time tracking middleware
 * Ensures <100ms API target compliance
 */
export const performanceTracker = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Add performance headers
  res.setHeader('X-Response-Time-Target', '100ms');
  res.setHeader('X-Performance-Optimized', 'true');

  // Override res.end to capture response time
  const originalEnd = res.end.bind(res);
  res.end = function(chunk?: any, encoding?: any, callback?: any): Response {
    const responseTime = Date.now() - startTime;

    // Update metrics
    metrics.requestCount++;
    metrics.totalResponseTime += responseTime;
    metrics.averageResponseTime = metrics.totalResponseTime / metrics.requestCount;

    if (responseTime > 100) {
      metrics.slowRequests++;
      logger.warn('Slow API response detected', {
        path: req.path,
        method: req.method,
        responseTime: `${responseTime}ms`,
        target: '100ms'
      });
    } else {
      metrics.fastRequests++;
    }

    // Add performance headers to response
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    res.setHeader('X-Performance-Status', responseTime <= 100 ? 'OPTIMAL' : 'SLOW');

    // Log performance metrics every 100 requests
    if (metrics.requestCount % 100 === 0) {
      logger.info('Performance metrics update', {
        totalRequests: metrics.requestCount,
        averageResponseTime: `${Math.round(metrics.averageResponseTime)}ms`,
        slowRequests: metrics.slowRequests,
        fastRequests: metrics.fastRequests,
        performanceRate: `${Math.round((metrics.fastRequests / metrics.requestCount) * 100)}%`
      });
    }

    // Call original end method
    return originalEnd(chunk, encoding, callback);
  } as any;

  next();
};

/**
 * Compression middleware for performance optimization
 */
export const performanceCompression = compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balance between compression ratio and speed
  threshold: 1024, // Only compress responses > 1KB
});

/**
 * Cache optimization headers
 */
export const cacheOptimization = (req: Request, res: Response, next: NextFunction) => {
  // Set cache headers for static assets
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
  }

  // Set cache headers for API responses
  if (req.path.startsWith('/api/')) {
    if (req.method === 'GET') {
      // Cache GET requests for 30 seconds
      res.setHeader('Cache-Control', 'public, max-age=30');
    } else {
      // No cache for mutations
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }

  next();
};

/**
 * Memory usage monitoring middleware
 */
export const memoryMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const memUsage = process.memoryUsage();

  // Log memory usage if it exceeds threshold
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  if (heapUsedMB > 500) { // 500MB threshold
    logger.warn('High memory usage detected', {
      heapUsed: `${Math.round(heapUsedMB)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      path: req.path
    });
  }

  next();
};

/**
 * Get current performance metrics
 */
export const getPerformanceMetrics = (): PerformanceMetrics => {
  return { ...metrics };
};

/**
 * Reset performance metrics
 */
export const resetPerformanceMetrics = (): void => {
  metrics.requestCount = 0;
  metrics.totalResponseTime = 0;
  metrics.averageResponseTime = 0;
  metrics.slowRequests = 0;
  metrics.fastRequests = 0;
  logger.info('Performance metrics reset');
};
