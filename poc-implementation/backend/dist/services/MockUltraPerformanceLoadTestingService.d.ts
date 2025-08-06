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
export declare class MockUltraPerformanceLoadTestingService {
    private metricsHistory;
    constructor();
    /**
     * Execute comprehensive load test with specified configuration
     */
    executeLoadTest(config: LoadTestConfig): Promise<LoadTestResult>;
    /**
     * Run mock load test simulation
     */
    private runMockLoadTest;
    /**
     * Calculate realistic metrics for each phase of the test
     */
    private calculatePhaseMetrics;
    /**
     * Evaluate if the test meets success criteria
     */
    private evaluateTestSuccess;
    /**
     * Analyze results and provide bottlenecks and recommendations
     */
    private analyzeResults;
}
//# sourceMappingURL=MockUltraPerformanceLoadTestingService.d.ts.map