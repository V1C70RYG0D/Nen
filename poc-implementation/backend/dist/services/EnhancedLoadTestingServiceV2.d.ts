/**
 * Enhanced Load Testing Service - Final 5% Gap Closure
 * Comprehensive load testing to validate production readiness
 * Following GI.md guidelines for 100% test coverage and real implementations
 */
interface LoadTestConfig {
    baseUrl: string;
    wsUrl: string;
    concurrentUsers: number;
    testDuration: number;
    requestsPerSecond: number;
    endpoints: string[];
}
interface LoadTestResult {
    testId: string;
    testName: string;
    duration: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
    timestamp: Date;
}
interface WebSocketTestResult {
    testId: string;
    connections: number;
    successfulConnections: number;
    averageLatency: number;
    maxLatency: number;
    messagesPerSecond: number;
    connectionErrors: number;
    timestamp: Date;
}
export declare class EnhancedLoadTestingServiceV2 {
    private config;
    private isRunning;
    private testResults;
    private wsTestResults;
    constructor();
    /**
     * Run comprehensive load test covering all POC backend plan requirements
     */
    runComprehensiveLoadTest(): Promise<{
        success: boolean;
        results: any;
    }>;
    /**
     * Test API endpoints with high concurrency
     */
    runAPILoadTest(): Promise<LoadTestResult>;
    /**
     * Test WebSocket connections for <50ms latency requirement
     */
    runWebSocketLoadTest(): Promise<WebSocketTestResult>;
    /**
     * Test database performance under load
     */
    runDatabaseLoadTest(): Promise<any>;
    /**
     * Test concurrent game sessions (1000+ games target)
     */
    runGameSessionLoadTest(): Promise<any>;
    /**
     * Test betting system under high load
     */
    runBettingLoadTest(): Promise<any>;
    /**
     * Test AI service performance
     */
    runAIServiceLoadTest(): Promise<any>;
    /**
     * Simulate user requests to endpoints
     */
    private simulateUserRequests;
    /**
     * Test individual WebSocket connection
     */
    private testWebSocketConnection;
    /**
     * Generate comprehensive load test summary
     */
    private generateLoadTestSummary;
    /**
     * Generate optimization recommendations
     */
    private generateRecommendations;
    /**
     * Get load test history
     */
    getTestHistory(): {
        apiTests: LoadTestResult[];
        wsTests: WebSocketTestResult[];
    };
    /**
     * Check if load testing is currently running
     */
    isTestRunning(): boolean;
    /**
     * Update load test configuration
     */
    updateConfig(newConfig: Partial<LoadTestConfig>): void;
}
export declare const enhancedLoadTestingServiceV2: EnhancedLoadTestingServiceV2;
export {};
//# sourceMappingURL=EnhancedLoadTestingServiceV2.d.ts.map