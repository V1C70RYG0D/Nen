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
    executeLoadTest(config: LoadTestConfig): Promise<LoadTestResult>;
    private prepareTestEnvironment;
    private optimizeConnectionPools;
    private initializeWorkerThreads;
    private runLoadTestPhases;
    private executeRampUpPhase;
    private executeSteadyStatePhase;
    private executeRampDownPhase;
    private createGamesInterval;
    private createSingleTestGame;
    private getCurrentConcurrentGames;
    private getCompletedGamesCount;
    private startMetricsCollection;
    private collectSystemMetrics;
    private analyzeTestResults;
    private cleanupTestEnvironment;
    validatePerformance(): Promise<{
        canHandle1000Games: boolean;
        currentMaxLatency: number;
        recommendations: string[];
    }>;
}
export declare const ultraPerformanceLoadTestingService: UltraPerformanceLoadTestingService;
//# sourceMappingURL=UltraPerformanceLoadTestingServiceV2.d.ts.map