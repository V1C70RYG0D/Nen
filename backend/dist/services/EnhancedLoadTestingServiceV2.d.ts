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
    runComprehensiveLoadTest(): Promise<{
        success: boolean;
        results: any;
    }>;
    runAPILoadTest(): Promise<LoadTestResult>;
    runWebSocketLoadTest(): Promise<WebSocketTestResult>;
    runDatabaseLoadTest(): Promise<any>;
    runGameSessionLoadTest(): Promise<any>;
    runBettingLoadTest(): Promise<any>;
    runAIServiceLoadTest(): Promise<any>;
    private simulateUserRequests;
    private testWebSocketConnection;
    private generateLoadTestSummary;
    private generateRecommendations;
    getTestHistory(): {
        apiTests: LoadTestResult[];
        wsTests: WebSocketTestResult[];
    };
    isTestRunning(): boolean;
    updateConfig(newConfig: Partial<LoadTestConfig>): void;
}
export declare const enhancedLoadTestingServiceV2: EnhancedLoadTestingServiceV2;
export {};
//# sourceMappingURL=EnhancedLoadTestingServiceV2.d.ts.map