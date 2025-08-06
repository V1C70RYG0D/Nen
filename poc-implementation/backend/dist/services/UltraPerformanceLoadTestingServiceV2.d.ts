export interface LoadTestConfig {
    targetConcurrentGames: number;
    testDurationMinutes: number;
    gamesPerMinute: number;
    maxLatencyMs: number;
    enableBetting: boolean;
    enableSpectators: boolean;
    metricsInterval: number;
}
export interface PerformanceMetrics {
    timestamp: Date;
    concurrentGames: number;
    averageLatency: number;
    maxLatency: number;
    minLatency: number;
    throughputGamesPerSecond: number;
    errorRate: number;
    memoryUsageMB: number;
    cpuUsagePercent: number;
    activeConnections: number;
    cacheHitRate: number;
    databaseConnectionsActive: number;
}
export interface LoadTestResult {
    testId: string;
    config: LoadTestConfig;
    startTime: Date;
    endTime: Date;
    totalGamesCreated: number;
    totalGamesCompleted: number;
    peakConcurrentGames: number;
    averageLatency: number;
    maxLatency: number;
    errorCount: number;
    errorRate: number;
    memoryPeakMB: number;
    cpuPeakPercent: number;
    throughputPeak: number;
    cacheEfficiency: number;
    success: boolean;
    bottlenecks: string[];
    recommendations: string[];
    detailedMetrics: PerformanceMetrics[];
}
export declare class UltraPerformanceLoadTestingService {
    private gameService;
    private bettingService;
    private aiService;
    private cache;
    private activeTests;
    private workers;
    private metricsHistory;
    constructor();
    /**
     * Execute comprehensive load test with specified configuration
     */
    executeLoadTest(config: LoadTestConfig): Promise<LoadTestResult>;
    /**
     * Prepare optimized test environment
     */
    private prepareTestEnvironment;
    /**
     * Optimize database and cache connection pools for high load
     */
    private optimizeConnectionPools;
    /**
     * Initialize worker threads for parallel game processing
     */
    private initializeWorkerThreads;
    /**
     * Execute load test in phases: ramp-up, steady-state, ramp-down
     */
    private runLoadTestPhases;
    /**
     * Execute ramp-up phase with gradual load increase
     */
    private executeRampUpPhase;
    /**
     * Execute steady-state phase with maximum load
     */
    private executeSteadyStatePhase;
    /**
     * Execute ramp-down phase with gradual load decrease
     */
    private executeRampDownPhase;
    /**
     * Create games for a specific interval
     */
    private createGamesInterval;
    /**
     * Create a single test game with performance measurement
     */
    private createSingleTestGame;
    /**
     * Get current concurrent games count
     */
    private getCurrentConcurrentGames;
    /**
     * Get completed games count for test
     */
    private getCompletedGamesCount;
    /**
     * Start metrics collection
     */
    private startMetricsCollection;
    /**
     * Collect comprehensive system metrics
     */
    private collectSystemMetrics;
    /**
     * Analyze test results and generate recommendations
     */
    private analyzeTestResults;
    /**
     * Cleanup test environment
     */
    private cleanupTestEnvironment;
    /**
     * Quick performance validation test
     */
    validatePerformance(): Promise<{
        canHandle1000Games: boolean;
        currentMaxLatency: number;
        recommendations: string[];
    }>;
}
export declare const ultraPerformanceLoadTestingService: UltraPerformanceLoadTestingService;
//# sourceMappingURL=UltraPerformanceLoadTestingServiceV2.d.ts.map