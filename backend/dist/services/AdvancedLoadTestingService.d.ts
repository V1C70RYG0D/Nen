interface LoadTestConfig {
    maxConcurrentGames: number;
    testDurationMs: number;
    rampUpTimeMs: number;
    latencyThresholdMs: number;
    memoryThresholdMB: number;
    cpuThresholdPercent: number;
    targetThroughput: number;
}
interface LoadTestMetrics {
    gamesStarted: number;
    gamesCompleted: number;
    gamesFailed: number;
    averageLatency: number;
    maxLatency: number;
    minLatency: number;
    throughput: number;
    memoryUsageMB: number;
    cpuUsagePercent: number;
    concurrentConnections: number;
    errorRate: number;
    timestamp: Date;
}
interface GameSession {
    id: string;
    startTime: number;
    endTime?: number;
    latency: number;
    status: 'running' | 'completed' | 'failed';
    moves: number;
    playerId1: string;
    playerId2: string;
}
interface PerformanceSnapshot {
    timestamp: Date;
    activeSessions: number;
    memoryUsage: number;
    cpuUsage: number;
    latency: number;
    throughput: number;
    errorCount: number;
}
declare class AdvancedLoadTestingService {
    private dbService;
    private redisClient;
    private activeSessions;
    private metrics;
    private performanceHistory;
    private testRunning;
    private testStartTime;
    private monitoringInterval;
    private websocketConnections;
    constructor();
    private initializeRedisClient;
    private resetMetrics;
    executeLoadTest(config?: LoadTestConfig): Promise<LoadTestMetrics>;
    private startPerformanceMonitoring;
    private capturePerformanceSnapshot;
    private getCPUUsage;
    private stressDatabaseConnections;
    private testDatabaseConnection;
    private stressWebSocketConnections;
    private createWebSocketConnection;
    private testWebSocketBroadcasting;
    private calculateWebSocketLatency;
    private executeConcurrentGameTest;
    private simulateGame;
    private simulateMove;
    private simulateDatabaseWrite;
    private simulateWebSocketBroadcast;
    private executeResourceStressTest;
    private createCPUWorker;
    private executeFailureRecoveryTest;
    private recoverFailedGame;
    private updateLatencyMetrics;
    private calculateFinalMetrics;
    private cleanupLoadTest;
    getLoadTestStatus(): {
        running: boolean;
        metrics: LoadTestMetrics;
        activeSessions: number;
        performanceHistory: PerformanceSnapshot[];
    };
    getScalingRecommendations(): {
        recommendations: string[];
        currentCapacity: number;
        recommendedCapacity: number;
        bottlenecks: string[];
    };
    exportTestResults(): any;
}
export declare function getAdvancedLoadTestingService(): AdvancedLoadTestingService;
export default AdvancedLoadTestingService;
export { AdvancedLoadTestingService, LoadTestConfig, LoadTestMetrics, GameSession, PerformanceSnapshot };
//# sourceMappingURL=AdvancedLoadTestingService.d.ts.map