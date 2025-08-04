/**
 * Performance Optimization Service
 * Phase 4.3: Comprehensive Review/Iteration - Performance Optimization
 *
 * Implements advanced performance optimizations to meet POC Master Plan targets:
 * - API Latency: <100ms (targeting <85ms)
 * - Game Moves: <50ms (targeting <42ms)
 * - Memory optimization and garbage collection tuning
 * - Request compression and response optimization
 *

 */

import compression from 'compression';
import express from 'express';
import cluster from 'cluster';
import os from 'os';
import { performance } from 'perf_hooks';
import { logger } from '../utils/logger';

// ==========================================
// PERFORMANCE CONFIGURATION
// ==========================================

interface PerformanceConfig {
  enableCompression: boolean;
  enableClustering: boolean;
  enableResponseCaching: boolean;
  enableRequestOptimization: boolean;
  maxRequestSize: string;
  compressionLevel: number;
  gcOptimization: boolean;
  memoryMonitoring: boolean;
}

interface PerformanceMetrics {
  responseTimeP95: number;
  responseTimeP99: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  memoryUsage: number;
  cpuUsage: number;
  errorRate: number;
  uptime: number;
}

// ==========================================
// PERFORMANCE OPTIMIZATION SERVICE
// ==========================================

export class PerformanceOptimizationService {
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics;
  private responseTimes: number[] = [];
  private startTime: number;

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = {
      enableCompression: true,
      enableClustering: false, // Disabled for POC to avoid complexity
      enableResponseCaching: true,
      enableRequestOptimization: true,
      maxRequestSize: '1mb',
      compressionLevel: 6,
      gcOptimization: true,
      memoryMonitoring: true,
      ...config
    };

    this.startTime = performance.now();
    this.metrics = this.initializeMetrics();

    if (this.config.gcOptimization) {
      this.optimizeGarbageCollection();
    }

    if (this.config.memoryMonitoring) {
      this.startMemoryMonitoring();
    }

    logger.info('Performance Optimization Service initialized with advanced optimizations');
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      responseTimeP95: 0,
      responseTimeP99: 0,
      averageResponseTime: 0,
      requestsPerSecond: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      errorRate: 0,
      uptime: 0
    };
  }

  // ==========================================
  // EXPRESS MIDDLEWARE OPTIMIZATIONS
  // ==========================================

  /**
   * Apply performance optimizations to Express app
   */
  public applyOptimizations(app: express.Application): void {
    // Enable compression for faster response times
    if (this.config.enableCompression) {
      app.use(compression({
        level: this.config.compressionLevel,
        threshold: 1024, // Only compress responses larger than 1KB
        filter: (req: any, res: any) => {
          // Don't compress if the response is already compressed
          if (req.headers['x-no-compression']) {
            return false;
          }
          // Fallback to standard filter function
          return compression.filter(req, res);
        }
      }));
      logger.info('Response compression enabled for performance optimization');
    }

    // Request optimization middleware
    if (this.config.enableRequestOptimization) {
      app.use(this.requestOptimizationMiddleware.bind(this));
    }

    // Response time tracking middleware
    app.use(this.responseTimeMiddleware.bind(this));

    // Memory usage optimization
    app.use(this.memoryOptimizationMiddleware.bind(this));

    logger.info('All performance optimizations applied to Express application');
  }

  /**
   * Request optimization middleware
   * Optimizes incoming requests for faster processing
   */
  private requestOptimizationMiddleware(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void {
    const startTime = performance.now();

    // Set optimization headers
    res.setHeader('X-Powered-By', 'Nen-Platform-Optimized');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    // Optimize response for common API responses
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'public, max-age=60'); // 1 minute cache for API
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }

    // Game move API optimization (Critical: <50ms target)
    if (req.path.includes('/game/move') || req.path.includes('/game/match')) {
      res.setHeader('Cache-Control', 'no-cache'); // Game data should be fresh
      res.setHeader('X-Game-API', 'true');

      // Pre-parse JSON for game requests
      if (req.method === 'POST' && req.headers['content-type']?.includes('json')) {
        req.on('data', chunk => {
          try {
            req.body = JSON.parse(chunk.toString());
          } catch (error) {
            // Will be handled by express.json() middleware
          }
        });
      }
    }

    req.optimizationStartTime = startTime;
    next();
  }

  /**
   * Response time tracking middleware
   * Tracks and logs response times for performance monitoring
   */
  private responseTimeMiddleware(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void {
    const startTime = performance.now();

    res.on('finish', () => {
      const responseTime = performance.now() - startTime;
      this.recordResponseTime(responseTime);

      // Log slow responses for optimization
      if (responseTime > 100) {
        logger.warn(`Slow response detected: ${req.method} ${req.path} - ${responseTime.toFixed(2)}ms`);
      }

      // Critical game move performance tracking
      if (req.path.includes('/game/move') && responseTime > 50) {
        logger.error(`Game move API exceeded 50ms target: ${responseTime.toFixed(2)}ms - ${req.path}`);
      }
    });

    next();
  }

  /**
   * Memory optimization middleware
   * Optimizes memory usage during request processing
   */
  private memoryOptimizationMiddleware(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void {
    // Set response end handler to clean up resources
    const originalEnd = res.end.bind(res);
    res.end = (chunk?: any, encoding?: any, cb?: any) => {
      // Clean up request-specific resources
      delete req.optimizationStartTime;
      delete req.cachedResults;

      // Force garbage collection for heavy operations (in development)
      if (process.env.NODE_ENV === 'development' && global.gc) {
        setImmediate(() => {
          if (global.gc) {
            global.gc();
          }
        });
      }

      return originalEnd(chunk, encoding, cb);
    };

    next();
  }

  // ==========================================
  // PERFORMANCE MONITORING
  // ==========================================

  /**
   * Record response time for metrics calculation
   */
  private recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);

    // Keep only last 1000 response times for memory efficiency
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }

    this.updateMetrics();
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    if (this.responseTimes.length === 0) return;

    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    this.metrics.responseTimeP95 = sortedTimes[p95Index] || 0;
    this.metrics.responseTimeP99 = sortedTimes[p99Index] || 0;
    this.metrics.averageResponseTime = sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length;
    this.metrics.uptime = (performance.now() - this.startTime) / 1000;

    // Update memory usage
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get performance status for health checks
   */
  public getPerformanceStatus(): {
    status: 'optimal' | 'degraded' | 'critical';
    metrics: PerformanceMetrics;
    recommendations: string[];
  } {
    const metrics = this.getMetrics();
    const recommendations: string[] = [];
    let status: 'optimal' | 'degraded' | 'critical' = 'optimal';

    // Check API latency targets (POC Master Plan: <100ms)
    if (metrics.responseTimeP95 > 100) {
      status = 'critical';
      recommendations.push('API response time exceeds 100ms target');
    } else if (metrics.responseTimeP95 > 85) {
      status = 'degraded';
      recommendations.push('API response time approaching 100ms limit');
    }

    // Check memory usage
    if (metrics.memoryUsage > 512) {
      status = 'critical';
      recommendations.push('High memory usage detected');
    } else if (metrics.memoryUsage > 256) {
      status = 'degraded';
      recommendations.push('Elevated memory usage');
    }

    return { status, metrics, recommendations };
  }

  // ==========================================
  // GARBAGE COLLECTION OPTIMIZATION
  // ==========================================

  /**
   * Optimize garbage collection for better performance
   */
  private optimizeGarbageCollection(): void {
    // Expose global GC if available
    if (typeof global.gc === 'function') {
      // Schedule periodic garbage collection in low-usage periods
      setInterval(() => {
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;

        // Trigger GC if memory usage is high
        if (heapUsedMB > 100 && global.gc) {
          global.gc();
          logger.debug('Garbage collection triggered due to high memory usage');
        }
      }, 30000); // Every 30 seconds

      logger.info('Garbage collection optimization enabled');
    } else {
      logger.warn('Garbage collection not available. Run with --expose-gc flag for optimization');
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      logger.debug('Memory usage:', {
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`,
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`
      });

      // Alert on high memory usage
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      if (heapUsedMB > 512) {
        logger.warn(`High memory usage detected: ${heapUsedMB.toFixed(2)}MB`);
      }
    }, 60000); // Every minute

    logger.info('Memory monitoring started');
  }

  // ==========================================
  // CLUSTERING SUPPORT (Future Enhancement)
  // ==========================================

  /**
   * Initialize clustering for multi-core performance
   * Note: Disabled in POC for simplicity
   */
  public static initializeClustering(): boolean {
    if (cluster.isMaster && process.env.NODE_ENV === 'production') {
      const numCPUs = os.cpus().length;

      logger.info(`Master process ${process.pid} is running`);
      logger.info(`Forking ${numCPUs} workers for optimal performance`);

      // Fork workers
      for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
      }

      cluster.on('exit', (worker, code, signal) => {
        logger.warn(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
        logger.info('Starting a new worker');
        cluster.fork();
      });

      return true; // Master process
    }

    return false; // Worker process or non-production
  }
}

// ==========================================
// EXPORT SINGLETON INSTANCE
// ==========================================

export const performanceOptimizer = new PerformanceOptimizationService({
  enableCompression: true,
  enableRequestOptimization: true,
  enableResponseCaching: true,
  gcOptimization: process.env.NODE_ENV === 'development',
  memoryMonitoring: true
});

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      optimizationStartTime?: number;
      cachedResults?: any;
    }
  }
}
