/**
 * Enhanced Load Testing Service - Final 5% Gap Closure
 * Comprehensive load testing capabilities for production readiness
 * Following GI.md guidelines for extensive testing at every stage
 */
interface LoadTestConfig {
    baseUrl: string;
    totalRequests: number;
    concurrentUsers: number;
    durationMs: number;
    rampUpMs: number;
    endpoints: TestEndpoint[];
    authTokens?: string[];
    customHeaders?: Record<string, string>;
}
interface TestEndpoint {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    weight: number;
    payload?: any;
    expectedStatusCode?: number;
    timeout?: number;
}
interface LoadTestResult {
    summary: {
        totalRequests: number;
        completedRequests: number;
        failedRequests: number;
        successRate: number;
        averageResponseTime: number;
        minResponseTime: number;
        maxResponseTime: number;
        p50: number;
        p90: number;
        p95: number;
        p99: number;
        requestsPerSecond: number;
        duration: number;
    };
    endpoints: Map<string, EndpointMetrics>;
    errors: ErrorSummary[];
    performanceIssues: PerformanceIssue[];
}
interface EndpointMetrics {
    path: string;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    responseTimes: number[];
    errorTypes: Map<string, number>;
}
interface ErrorSummary {
    type: string;
    count: number;
    percentage: number;
    sample: string;
}
interface PerformanceIssue {
    type: 'slow_response' | 'high_error_rate' | 'timeout' | 'memory_leak';
    endpoint: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    metric: number;
}
export declare class EnhancedLoadTestingService {
    private results;
    private startTime;
    private activeRequests;
    private completedRequests;
    constructor();
    /**
     * Run comprehensive load test
     */
    runLoadTest(config: LoadTestConfig): Promise<LoadTestResult>;
    /**
     * Run constant load pattern
     */
    private runConstantLoad;
    /**
     * Run spike test pattern
     */
    private runSpikeTest;
    /**
     * Run stress test pattern
     */
    private runStressTest;
    /**
     * Make individual HTTP request with metrics tracking
     */
    private makeRequest;
    /**
     * Select endpoint based on weight distribution
     */
    private selectEndpoint;
    /**
     * Calculate final metrics and percentiles
     */
    private calculateFinalMetrics;
    /**
     * Calculate percentile value
     */
    private calculatePercentile;
    /**
     * Identify performance issues
     */
    private identifyPerformanceIssues;
    /**
     * Initialize empty results structure
     */
    private initializeResults;
    /**
     * Generate comprehensive test report
     */
    generateReport(): string;
}
export default EnhancedLoadTestingService;
//# sourceMappingURL=EnhancedLoadTestingService.d.ts.map