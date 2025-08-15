/**
 * Advanced Load Testing Service - Final 5% Implementation
 * Supports 1000+ concurrent games and validates system scalability
 *
 * Features:
 * - Concurrent game load testing up to 1000+ sessions
 * - Real-time performance monitoring and metrics
 * - WebSocket load testing with <100ms latency validation
 * - Database stress testing with connection pooling
 * - Memory and CPU usage monitoring
 * - Auto-scaling recommendations
 * - Failure recovery testing
 */
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
    /**
     * Initialize Redis client for caching load testing
     */
    private initializeRedisClient;
    /**
     * Reset metrics for new test run
     */
    private resetMetrics;
    /**
     * Execute comprehensive load test with 1000+ concurrent games
     */
    executeLoadTest(config?: LoadTestConfig): Promise<LoadTestMetrics>;
    /**
     * Start performance monitoring during load test
     */
    private startPerformanceMonitoring;
    /**
     * Capture current performance snapshot
     */
    private capturePerformanceSnapshot;
    /**
     * Get CPU usage percentage
     */
    private getCPUUsage;
    /**
     * Stress test database connections with connection pooling
     */
    private stressDatabaseConnections;
    /**
     * Test individual database connection
     */
    private testDatabaseConnection;
    /**
     * Stress test WebSocket connections
     */
    private stressWebSocketConnections;
    /**
     * Create individual WebSocket connection for testing
     */
    private createWebSocketConnection;
    /**
     * Test WebSocket broadcasting performance
     */
    private testWebSocketBroadcasting;
    /**
     * Calculate WebSocket latency
     */
    private calculateWebSocketLatency;
    /**
     * Execute concurrent game test with specified load
     */
    private executeConcurrentGameTest;
    /**
     * Simulate a single game session
     */
    private simulateGame;
    /**
     * Simulate a single move with latency testing
     */
    private simulateMove;
    /**
     * Simulate database write for move storage
     */
    private simulateDatabaseWrite;
    /**
     * Simulate WebSocket broadcast for move updates
     */
    private simulateWebSocketBroadcast;
    /**
     * Execute resource stress test (memory and CPU)
     */
    private executeResourceStressTest;
    /**
     * Create CPU worker for stress testing
     */
    private createCPUWorker;
    /**
     * Execute failure recovery test
     */
    private executeFailureRecoveryTest;
    /**
     * Recover a failed game session
     */
    private recoverFailedGame;
    /**
     * Update latency metrics
     */
    private updateLatencyMetrics;
    /**
     * Calculate final metrics
     */
    private calculateFinalMetrics;
    /**
     * Cleanup after load test
     */
    private cleanupLoadTest;
    /**
     * Get current load test status
     */
    getLoadTestStatus(): {
        running: boolean;
        metrics: LoadTestMetrics;
        activeSessions: number;
        performanceHistory: PerformanceSnapshot[];
    };
    /**
     * Get scaling recommendations based on test results
     */
    getScalingRecommendations(): {
        recommendations: string[];
        currentCapacity: number;
        recommendedCapacity: number;
        bottlenecks: string[];
    };
    /**
     * Export test results for analysis
     */
    exportTestResults(): any;
}
export declare function getAdvancedLoadTestingService(): AdvancedLoadTestingService;
export default AdvancedLoadTestingService;
export { AdvancedLoadTestingService, LoadTestConfig, LoadTestMetrics, GameSession, PerformanceSnapshot };
//# sourceMappingURL=AdvancedLoadTestingService.d.ts.map