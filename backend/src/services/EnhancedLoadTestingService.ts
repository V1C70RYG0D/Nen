/**
 * Enhanced Load Testing Service - Final 5% Gap Closure
 * Comprehensive load testing capabilities for production readiness
 * Following GI.md guidelines for extensive testing at every stage
 */

import { performance } from 'perf_hooks';
import axios from 'axios';
import { logger } from '../utils/logger';

// ==========================================
// LOAD TESTING TYPES & INTERFACES
// ==========================================

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
    weight: number; // Percentage of total requests
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

// ==========================================
// ENHANCED LOAD TESTING SERVICE
// ==========================================

export class EnhancedLoadTestingService {
    private results: LoadTestResult;
    private startTime: number = 0;
    private activeRequests: number = 0;
    private completedRequests: number = 0;

    constructor() {
        this.results = this.initializeResults();
    }

    /**
     * Run comprehensive load test
     */
    async runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
        logger.info('Starting enhanced load test', {
            totalRequests: config.totalRequests,
            concurrentUsers: config.concurrentUsers,
            duration: `${config.durationMs}ms`,
            endpoints: config.endpoints.length
        });

        this.results = this.initializeResults();
        this.startTime = performance.now();

        // Initialize endpoint metrics
        config.endpoints.forEach(endpoint => {
            const key = `${endpoint.method} ${endpoint.path}`;
            this.results.endpoints.set(key, {
                path: endpoint.path,
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                averageResponseTime: 0,
                responseTimes: [],
                errorTypes: new Map()
            });
        });

        try {
            // Run load test with different patterns
            await Promise.all([
                this.runConstantLoad(config),
                this.runSpikeTest(config),
                this.runStressTest(config)
            ]);

            // Calculate final metrics
            this.calculateFinalMetrics();
            this.identifyPerformanceIssues();

            const endTime = performance.now();
            this.results.summary.duration = endTime - this.startTime;

            logger.info('Load test completed', {
                duration: `${this.results.summary.duration}ms`,
                successRate: `${this.results.summary.successRate}%`,
                avgResponseTime: `${this.results.summary.averageResponseTime}ms`,
                requestsPerSecond: this.results.summary.requestsPerSecond
            });

            return this.results;

        } catch (error) {
            logger.error('Load test failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Run constant load pattern
     */
    private async runConstantLoad(config: LoadTestConfig): Promise<void> {
        const requestsPerSecond = config.totalRequests / (config.durationMs / 1000) / 3; // 1/3 of load
        const intervalMs = 1000 / requestsPerSecond;

        logger.info('Starting constant load pattern', { requestsPerSecond });

        const promises: Promise<void>[] = [];
        const endTime = Date.now() + (config.durationMs / 3);

        while (Date.now() < endTime && this.completedRequests < config.totalRequests / 3) {
            const endpoint = this.selectEndpoint(config.endpoints);
            promises.push(this.makeRequest(config.baseUrl, endpoint, config.authTokens, config.customHeaders));

            if (promises.length >= config.concurrentUsers) {
                await Promise.race(promises);
                promises.splice(promises.findIndex(p => p), 1);
            }

            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }

        await Promise.all(promises);
    }

    /**
     * Run spike test pattern
     */
    private async runSpikeTest(config: LoadTestConfig): Promise<void> {
        logger.info('Starting spike test pattern');

        const promises: Promise<void>[] = [];
        const spikeRequests = Math.floor(config.totalRequests / 3);

        // Sudden spike of requests
        for (let i = 0; i < spikeRequests; i++) {
            const endpoint = this.selectEndpoint(config.endpoints);
            promises.push(this.makeRequest(config.baseUrl, endpoint, config.authTokens, config.customHeaders));

            if (promises.length >= config.concurrentUsers * 2) {
                await Promise.race(promises);
                promises.splice(promises.findIndex(p => p), 1);
            }
        }

        await Promise.all(promises);
    }

    /**
     * Run stress test pattern
     */
    private async runStressTest(config: LoadTestConfig): Promise<void> {
        logger.info('Starting stress test pattern');

        const promises: Promise<void>[] = [];
        const stressRequests = Math.floor(config.totalRequests / 3);

        // Gradually increasing load
        for (let i = 0; i < stressRequests; i++) {
            const endpoint = this.selectEndpoint(config.endpoints);
            promises.push(this.makeRequest(config.baseUrl, endpoint, config.authTokens, config.customHeaders));

            const concurrency = Math.min(
                config.concurrentUsers * (1 + i / stressRequests),
                config.concurrentUsers * 3
            );

            if (promises.length >= concurrency) {
                await Promise.race(promises);
                promises.splice(promises.findIndex(p => p), 1);
            }

            // Slight delay for ramp-up
            if (i % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }

        await Promise.all(promises);
    }

    /**
     * Make individual HTTP request with metrics tracking
     */
    private async makeRequest(
        baseUrl: string,
        endpoint: TestEndpoint,
        authTokens?: string[],
        customHeaders?: Record<string, string>
    ): Promise<void> {
        const startTime = performance.now();
        const endpointKey = `${endpoint.method} ${endpoint.path}`;
        const metrics = this.results.endpoints.get(endpointKey)!;

        this.activeRequests++;
        metrics.totalRequests++;

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                ...customHeaders
            };

            // Add auth token if available
            if (authTokens && authTokens.length > 0) {
                const token = authTokens[Math.floor(Math.random() * authTokens.length)];
                headers.Authorization = `Bearer ${token}`;
            }

            const response = await axios({
                method: endpoint.method,
                url: `${baseUrl}${endpoint.path}`,
                data: endpoint.payload,
                headers,
                timeout: endpoint.timeout || 30000,
                validateStatus: () => true // Don't throw on HTTP errors
            });

            const endTime = performance.now();
            const responseTime = endTime - startTime;

            // Record metrics
            metrics.responseTimes.push(responseTime);

            // Check if response is expected
            const expectedStatus = endpoint.expectedStatusCode || 200;
            if (response.status === expectedStatus || (response.status >= 200 && response.status < 300)) {
                metrics.successfulRequests++;
            } else {
                metrics.failedRequests++;
                const errorType = `HTTP_${response.status}`;
                metrics.errorTypes.set(errorType, (metrics.errorTypes.get(errorType) || 0) + 1);
            }

            // Track slow responses
            if (responseTime > 1000) {
                this.results.performanceIssues.push({
                    type: 'slow_response',
                    endpoint: endpoint.path,
                    severity: responseTime > 5000 ? 'critical' : 'high',
                    description: `Response time ${responseTime.toFixed(2)}ms exceeds threshold`,
                    metric: responseTime
                });
            }

        } catch (error) {
            const endTime = performance.now();
            const responseTime = endTime - startTime;

            metrics.failedRequests++;
            metrics.responseTimes.push(responseTime);

            const errorType = error instanceof Error ? error.name : 'UNKNOWN_ERROR';
            metrics.errorTypes.set(errorType, (metrics.errorTypes.get(errorType) || 0) + 1);

            // Record error for summary
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const existingError = this.results.errors.find(e => e.type === errorType);
            if (existingError) {
                existingError.count++;
            } else {
                this.results.errors.push({
                    type: errorType,
                    count: 1,
                    percentage: 0, // Will be calculated later
                    sample: errorMessage
                });
            }

        } finally {
            this.activeRequests--;
            this.completedRequests++;
        }
    }

    /**
     * Select endpoint based on weight distribution
     */
    private selectEndpoint(endpoints: TestEndpoint[]): TestEndpoint {
        const random = Math.random() * 100;
        let cumulative = 0;

        for (const endpoint of endpoints) {
            cumulative += endpoint.weight;
            if (random <= cumulative) {
                return endpoint;
            }
        }

        return endpoints[0]; // Fallback
    }

    /**
     * Calculate final metrics and percentiles
     */
    private calculateFinalMetrics(): void {
        let totalRequests = 0;
        let totalSuccessful = 0;
        let totalFailed = 0;
        let allResponseTimes: number[] = [];

        // Aggregate metrics from all endpoints
        for (const metrics of this.results.endpoints.values()) {
            totalRequests += metrics.totalRequests;
            totalSuccessful += metrics.successfulRequests;
            totalFailed += metrics.failedRequests;
            allResponseTimes = allResponseTimes.concat(metrics.responseTimes);

            // Calculate endpoint averages
            if (metrics.responseTimes.length > 0) {
                metrics.averageResponseTime =
                    metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
            }
        }

        // Sort response times for percentile calculation
        allResponseTimes.sort((a, b) => a - b);

        // Calculate summary metrics
        this.results.summary.totalRequests = totalRequests;
        this.results.summary.completedRequests = totalSuccessful + totalFailed;
        this.results.summary.failedRequests = totalFailed;
        this.results.summary.successRate = totalRequests > 0 ? (totalSuccessful / totalRequests) * 100 : 0;

        if (allResponseTimes.length > 0) {
            this.results.summary.averageResponseTime =
                allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length;
            this.results.summary.minResponseTime = Math.min(...allResponseTimes);
            this.results.summary.maxResponseTime = Math.max(...allResponseTimes);
            this.results.summary.p50 = this.calculatePercentile(allResponseTimes, 50);
            this.results.summary.p90 = this.calculatePercentile(allResponseTimes, 90);
            this.results.summary.p95 = this.calculatePercentile(allResponseTimes, 95);
            this.results.summary.p99 = this.calculatePercentile(allResponseTimes, 99);
        }

        // Calculate requests per second
        const durationSeconds = this.results.summary.duration / 1000;
        this.results.summary.requestsPerSecond = durationSeconds > 0 ? totalRequests / durationSeconds : 0;

        // Calculate error percentages
        this.results.errors.forEach(error => {
            error.percentage = totalRequests > 0 ? (error.count / totalRequests) * 100 : 0;
        });
    }

    /**
     * Calculate percentile value
     */
    private calculatePercentile(sortedArray: number[], percentile: number): number {
        const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
        return sortedArray[index] || 0;
    }

    /**
     * Identify performance issues
     */
    private identifyPerformanceIssues(): void {
        // Check overall error rate
        if (this.results.summary.successRate < 95) {
            this.results.performanceIssues.push({
                type: 'high_error_rate',
                endpoint: 'overall',
                severity: this.results.summary.successRate < 90 ? 'critical' : 'high',
                description: `Success rate ${this.results.summary.successRate.toFixed(2)}% below threshold`,
                metric: this.results.summary.successRate
            });
        }

        // Check response time thresholds
        if (this.results.summary.p95 > 1000) {
            this.results.performanceIssues.push({
                type: 'slow_response',
                endpoint: 'overall',
                severity: this.results.summary.p95 > 5000 ? 'critical' : 'high',
                description: `P95 response time ${this.results.summary.p95.toFixed(2)}ms exceeds 1000ms threshold`,
                metric: this.results.summary.p95
            });
        }

        // Check individual endpoint issues
        for (const [endpointKey, metrics] of this.results.endpoints.entries()) {
            const errorRate = metrics.totalRequests > 0 ?
                (metrics.failedRequests / metrics.totalRequests) * 100 : 0;

            if (errorRate > 10) {
                this.results.performanceIssues.push({
                    type: 'high_error_rate',
                    endpoint: endpointKey,
                    severity: errorRate > 25 ? 'critical' : 'high',
                    description: `Endpoint error rate ${errorRate.toFixed(2)}% exceeds 10% threshold`,
                    metric: errorRate
                });
            }
        }
    }

    /**
     * Initialize empty results structure
     */
    private initializeResults(): LoadTestResult {
        return {
            summary: {
                totalRequests: 0,
                completedRequests: 0,
                failedRequests: 0,
                successRate: 0,
                averageResponseTime: 0,
                minResponseTime: 0,
                maxResponseTime: 0,
                p50: 0,
                p90: 0,
                p95: 0,
                p99: 0,
                requestsPerSecond: 0,
                duration: 0
            },
            endpoints: new Map(),
            errors: [],
            performanceIssues: []
        };
    }

    /**
     * Generate comprehensive test report
     */
    generateReport(): string {
        const report = `
# Enhanced Load Test Report
Generated: ${new Date().toISOString()}

## Summary
- **Total Requests**: ${this.results.summary.totalRequests}
- **Success Rate**: ${this.results.summary.successRate.toFixed(2)}%
- **Average Response Time**: ${this.results.summary.averageResponseTime.toFixed(2)}ms
- **P95 Response Time**: ${this.results.summary.p95.toFixed(2)}ms
- **Requests/Second**: ${this.results.summary.requestsPerSecond.toFixed(2)}
- **Duration**: ${(this.results.summary.duration / 1000).toFixed(2)}s

## Performance Issues
${this.results.performanceIssues.length === 0 ? 'No critical performance issues detected.' :
  this.results.performanceIssues.map(issue =>
    `- **${issue.severity.toUpperCase()}**: ${issue.description} (${issue.endpoint})`
  ).join('\n')}

## Endpoint Metrics
${Array.from(this.results.endpoints.entries()).map(([key, metrics]) => `
### ${key}
- Requests: ${metrics.totalRequests}
- Success Rate: ${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)}%
- Avg Response Time: ${metrics.averageResponseTime.toFixed(2)}ms
`).join('')}

## Error Summary
${this.results.errors.length === 0 ? 'No errors detected.' :
  this.results.errors.map(error =>
    `- **${error.type}**: ${error.count} occurrences (${error.percentage.toFixed(2)}%)`
  ).join('\n')}
        `;

        return report.trim();
    }
}

export default EnhancedLoadTestingService;
