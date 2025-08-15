import { EventEmitter } from 'events';
export declare class PerformanceMonitor extends EventEmitter {
    private static instance;
    private activeUsers;
    private constructor();
    static getInstance(): PerformanceMonitor;
    /**
     * Track move execution latency
     */
    trackMoveLatency(startTime: number, endTime: number, moveType?: string, playerType?: string): void;
    /**
     * Track cache operation performance
     */
    trackCachePerformance(operation: string, duration: number, cacheType?: string): void;
    /**
     * Track AI move calculation performance
     */
    trackAIPerformance(personality: string, moveTime: number, difficulty?: string): void;
    /**
     * Track user session start
     */
    trackUserSessionStart(userId: string, region: string): void;
    /**
     * Track user session end
     */
    trackUserSessionEnd(userId: string, userType?: string): void;
    /**
     * Track application errors
     */
    trackError(errorType: string, severity?: 'low' | 'medium' | 'high' | 'critical'): void;
    /**
     * Get geographic performance distribution
     */
    getGeographicDistribution(): Record<string, number>;
    /**
     * Get current metrics for dashboard
     */
    getCurrentMetrics(): Promise<string>;
    /**
     * Get performance summary
     */
    getPerformanceSummary(): object;
    /**
     * Setup periodic metrics collection
     */
    private setupPeriodicMetrics;
    /**
     * Update active users metric by region
     */
    private updateActiveUsersMetric;
}
export declare const performanceMonitor: PerformanceMonitor;
//# sourceMappingURL=performance-monitor.d.ts.map