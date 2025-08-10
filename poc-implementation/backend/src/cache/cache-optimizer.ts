/**
 * MagicBlock Cache Optimization Module
 * 
 * Implements high-performance caching strategies for MagicBlock POC
 * - L1 Cache: In-memory cache for sub-1ms access
 * - L2 Cache: Redis cache for sub-5ms access  
 * - Intelligent cache warming and preloading
 * - Performance monitoring and optimization
 */

import { getRedisClient } from '../config/redis';
import { PerformanceMonitor } from '../monitoring/performance-monitor';
import { logger } from '../utils/logger';

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
}

interface CacheMetrics {
  l1Hits: number;
  l1Misses: number;
  l2Hits: number;
  l2Misses: number;
  avgL1Latency: number;
  avgL2Latency: number;
  totalRequests: number;
}

class CacheOptimizer {
  private l1Cache: Map<string, CacheEntry> = new Map();
  private l1MaxSize: number = 10000; // Configurable L1 cache size
  private l2MaxSize: number = 100000; // Configurable L2 cache size
  private metrics: CacheMetrics;
  private performanceMonitor: PerformanceMonitor;
  private redis: any;

  constructor() {
    this.metrics = {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      avgL1Latency: 0,
      avgL2Latency: 0,
      totalRequests: 0
    };
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.redis = getRedisClient();
    
    // Start cache maintenance intervals
    this.startCacheMaintenance();
  }

  /**
   * Get data from cache with automatic fallback strategy
   */
  async get<T>(key: string, fallbackFn?: () => Promise<T> | T, ttl: number = 300): Promise<T | null> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // Try L1 cache first (target: <1ms)
      const l1Result = await this.getFromL1<T>(key);
      if (l1Result !== null) {
        this.metrics.l1Hits++;
        const latency = Date.now() - startTime;
        this.updateL1Latency(latency);
        return l1Result;
      }
      this.metrics.l1Misses++;

      // Try L2 cache (Redis) (target: <5ms)
      const l2Result = await this.getFromL2<T>(key);
      if (l2Result !== null) {
        this.metrics.l2Hits++;
        // Promote to L1 for faster future access
        await this.setInL1(key, l2Result, ttl);
        const latency = Date.now() - startTime;
        this.updateL2Latency(latency);
        return l2Result;
      }
      this.metrics.l2Misses++;

      // Fallback to data source
      if (fallbackFn) {
        const data = await fallbackFn();
        if (data !== null && data !== undefined) {
          // Store in both caches
          await this.set(key, data, ttl);
        }
        return data;
      }

      return null;
    } catch (error) {
      logger.error('Cache get operation failed', { key, error: (error as Error).message });
      if (fallbackFn) {
        return await fallbackFn();
      }
      return null;
    }
  }

  /**
   * Set data in cache with intelligent placement
   */
  async set<T>(key: string, data: T, ttl: number = 300): Promise<void> {
    try {
      // Store in L1 for immediate access
      await this.setInL1(key, data, ttl);
      
      // Store in L2 for persistence
      await this.setInL2(key, data, ttl);
    } catch (error) {
      logger.error('Cache set operation failed', { key, error: (error as Error).message });
    }
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache(warmupData: Array<{ key: string; data: any; ttl?: number }>): Promise<void> {
    logger.info('Starting cache warmup', { itemCount: warmupData.length });
    
    const startTime = Date.now();
    const batchSize = 100;
    
    for (let i = 0; i < warmupData.length; i += batchSize) {
      const batch = warmupData.slice(i, i + batchSize);
      await Promise.all(
        batch.map(item => this.set(item.key, item.data, item.ttl || 300))
      );
    }
    
    const duration = Date.now() - startTime;
    logger.info('Cache warmup completed', { duration, itemCount: warmupData.length });
  }

  /**
   * Pre-load game session data for optimal performance
   */
  async preloadGameSession(sessionId: string, gameData: any): Promise<void> {
    const keys = [
      `session:${sessionId}`,
      `game:${sessionId}:state`,
      `game:${sessionId}:moves`,
      `game:${sessionId}:players`,
      `game:${sessionId}:ai`
    ];

    await Promise.all(
      keys.map(key => {
        const lastPart = key.split(':').pop();
        if (lastPart && gameData[lastPart]) {
          return this.set(key, gameData[lastPart], 600);
        }
        return Promise.resolve();
      })
    );
  }

  /**
   * Get cache metrics and performance data
   */
  getMetrics(): CacheMetrics & { hitRate: number; l1HitRate: number; l2HitRate: number } {
    const totalHits = this.metrics.l1Hits + this.metrics.l2Hits;
    const totalMisses = this.metrics.l1Misses + this.metrics.l2Misses;
    const totalRequests = totalHits + totalMisses;
    
    return {
      ...this.metrics,
      hitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0,
      l1HitRate: (this.metrics.l1Hits + this.metrics.l1Misses) > 0 
        ? (this.metrics.l1Hits / (this.metrics.l1Hits + this.metrics.l1Misses)) * 100 
        : 0,
      l2HitRate: (this.metrics.l2Hits + this.metrics.l2Misses) > 0 
        ? (this.metrics.l2Hits / (this.metrics.l2Hits + this.metrics.l2Misses)) * 100 
        : 0
    };
  }

  /**
   * L1 Cache operations (In-Memory)
   */
  private async getFromL1<T>(key: string): Promise<T | null> {
    const entry = this.l1Cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.l1Cache.delete(key);
      return null;
    }

    entry.accessCount++;
    return entry.data;
  }

  private async setInL1<T>(key: string, data: T, ttl: number): Promise<void> {
    // Implement LRU eviction if cache is full
    if (this.l1Cache.size >= this.l1MaxSize) {
      this.evictLRU();
    }

    this.l1Cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0
    });
  }

  /**
   * L2 Cache operations (Redis)
   */
  private async getFromL2<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('L2 cache get failed', { key, error: (error as Error).message });
      return null;
    }
  }

  private async setInL2<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      logger.error('L2 cache set failed', { key, error: (error as Error).message });
    }
  }

  /**
   * Cache maintenance and optimization
   */
  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.l1Cache.delete(oldestKey);
    }
  }

  private startCacheMaintenance(): void {
    // Clean expired entries every 30 seconds
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.l1Cache.entries()) {
        if (now - entry.timestamp > entry.ttl * 1000) {
          this.l1Cache.delete(key);
        }
      }
    }, 30000);

    // Log metrics every 60 seconds
    setInterval(() => {
      const metrics = this.getMetrics();
      logger.info('Cache performance metrics', metrics);
      
      // Track performance for monitoring
      this.performanceMonitor.trackCachePerformance('get', metrics.avgL1Latency, 'L1');
      this.performanceMonitor.trackCachePerformance('get', metrics.avgL2Latency, 'L2');
    }, 60000);
  }

  private updateL1Latency(latency: number): void {
    this.metrics.avgL1Latency = (this.metrics.avgL1Latency + latency) / 2;
  }

  private updateL2Latency(latency: number): void {
    this.metrics.avgL2Latency = (this.metrics.avgL2Latency + latency) / 2;
  }

  /**
   * Clear all cache data
   */
  async clear(): Promise<void> {
    this.l1Cache.clear();
    try {
      await this.redis.flushdb();
    } catch (error) {
      logger.error('Failed to clear L2 cache', { error: (error as Error).message });
    }
  }

  /**
   * Get cache size information
   */
  getCacheSize(): { l1Size: number; l1MaxSize: number; l2MaxSize: number } {
    return {
      l1Size: this.l1Cache.size,
      l1MaxSize: this.l1MaxSize,
      l2MaxSize: this.l2MaxSize
    };
  }
}

// Export singleton instance
export const cacheOptimizer = new CacheOptimizer();

/**
 * High-performance cache decorator for frequently accessed functions
 */
export function cached(ttl: number = 300) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
      
      return await cacheOptimizer.get(
        cacheKey,
        () => method.apply(this, args),
        ttl
      );
    };
  };
}

export default cacheOptimizer;
