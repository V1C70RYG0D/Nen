#!/usr/bin/env node

/**
 * Shortened Load Testing Script for 1,000 Users
 * Tests the system quickly with 1,000 concurrent users over 10 minutes
 * Verifies response time under 50ms with 0% error rate
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Load test configuration for quick test
const LOAD_TEST_CONFIG = {
    baseUrl: process.env.LOAD_TEST_BASE_URL || process.env.TEST_API_BASE_URL || 'http://localhost:5002',
    totalUsers: 1000,
    durationMs: 600000, // 10 minutes
    rampUpMs: 60000,     // 1 minute ramp-up
    maxConcurrentRequests: 1000,
    requestInterval: 5000, // 5 seconds between requests per user
    endpoints: [
        { method: 'GET', path: '/health', weight: 30, expectedMs: 50 },
        { method: 'GET', path: '/api/v1/ai/agents', weight: 25, expectedMs: 50 },
        { method: 'GET', path: '/api/metrics', weight: 20, expectedMs: 50 },
        { method: 'GET', path: '/api/v1/betting/odds/test-match', weight: 25, expectedMs: 50 }
    ]
};

// Performance metrics tracking
const metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    responseTimes: [],
    errors: {},
    startTime: 0,
    endTime: 0
};

class QuickLoadTester {
    constructor(config) {
        this.config = config;
        this.activeUsers = 0;
        this.isRunning = false;
        this.userPromises = [];
    }

    /**
     * Start the quick load test
     */
    async startLoadTest() {
        console.log('🚀 Starting Quick Load Test for 1,000 Users');
        console.log(`Configuration:
        - Target Users: ${this.config.totalUsers}
        - Duration: ${this.config.durationMs / 1000 / 60} minutes
        - Max Response Time: 50ms
        - Target Error Rate: 0%
        `);

        metrics.startTime = performance.now();
        this.isRunning = true;

        // Start user simulation with ramp-up
        await this.rampUpUsers();

        // Wait for test duration
        await this.waitForTestCompletion();

        // Stop all users
        this.isRunning = false;
        await Promise.allSettled(this.userPromises);

        metrics.endTime = performance.now();

        // Generate comprehensive report
        return this.generateReport();
    }

    /**
     * Ramp up users gradually
     */
    async rampUpUsers() {
        const rampUpInterval = this.config.rampUpMs / this.config.totalUsers;

        for (let i = 0; i < this.config.totalUsers; i++) {
            if (!this.isRunning) break;

            const userPromise = this.simulateUser(i);
            this.userPromises.push(userPromise);
            this.activeUsers++;

            if (i % 100 === 0) {
                console.log(`⚡ Ramped up ${i + 1}/${this.config.totalUsers} users`);
            }

            await new Promise(resolve => setTimeout(resolve, rampUpInterval));
        }

        console.log(`✅ All ${this.config.totalUsers} users active`);
    }

    /**
     * Simulate a single user's behavior
     */
    async simulateUser(userId) {
        while (this.isRunning) {
            try {
                const endpoint = this.selectEndpoint();
                await this.makeRequest(endpoint, userId);

                // Wait before next request
                await new Promise(resolve =>
                    setTimeout(resolve, this.config.requestInterval)
                );
            } catch (error) {
                // User simulation error - continue
                console.error(`User ${userId} error:`, error.message);
            }
        }
    }

    /**
     * Select endpoint based on weight distribution
     */
    selectEndpoint() {
        const random = Math.random() * 100;
        let cumulative = 0;

        for (const endpoint of this.config.endpoints) {
            cumulative += endpoint.weight;
            if (random <= cumulative) {
                return endpoint;
            }
        }

        return this.config.endpoints[0]; // Fallback
    }

    /**
     * Make HTTP request and track metrics
     */
    async makeRequest(endpoint, userId) {
        const startTime = performance.now();
        metrics.totalRequests++;

        try {
            const response = await axios({
                method: endpoint.method,
                url: `${this.config.baseUrl}${endpoint.path}`,
                timeout: 30000,
                validateStatus: () => true
            });

            const endTime = performance.now();
            const responseTime = endTime - startTime;

            metrics.responseTimes.push(responseTime);

            if (response.status >= 200 && response.status < 300) {
                metrics.successfulRequests++;

                // Check if response time exceeds 50ms threshold
                if (responseTime > 50) {
                    console.warn(`⚠️  Response time ${responseTime.toFixed(2)}ms exceeds 50ms threshold for ${endpoint.path}`);
                }
            } else {
                metrics.failedRequests++;
                const errorKey = `HTTP_${response.status}`;
                metrics.errors[errorKey] = (metrics.errors[errorKey] || 0) + 1;
            }

        } catch (error) {
            const endTime = performance.now();
            const responseTime = endTime - startTime;

            metrics.responseTimes.push(responseTime);
            metrics.failedRequests++;

            const errorKey = error.code || error.name || 'UNKNOWN_ERROR';
            metrics.errors[errorKey] = (metrics.errors[errorKey] || 0) + 1;
        }
    }

    /**
     * Wait for test completion
     */
    async waitForTestCompletion() {
        console.log('🕐 Running test for 10 minutes...');

        const reportInterval = 300000; // Report every 5 minutes
        const totalIntervals = this.config.durationMs / reportInterval;

        for (let i = 0; i < totalIntervals; i++) {
            if (!this.isRunning) break;

            await new Promise(resolve => setTimeout(resolve, reportInterval));

            // Progress report
            const elapsed = (i + 1) * reportInterval / 1000 / 60;
            const progress = ((i + 1) / totalIntervals * 100).toFixed(1);

            console.log(`📊 Progress: ${progress}% (${elapsed} minutes) - Active Users: ${this.activeUsers}`);
            this.printInterimMetrics();
        }
    }

    /**
     * Print interim performance metrics
     */
    printInterimMetrics() {
        if (metrics.responseTimes.length === 0) return;

        const sortedTimes = [...metrics.responseTimes].sort((a, b) => a - b);
        const avgResponseTime = sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length;
        const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
        const errorRate = (metrics.failedRequests / metrics.totalRequests * 100).toFixed(2);

        console.log(`   Requests: ${metrics.totalRequests}, Avg Response: ${avgResponseTime.toFixed(2)}ms, P95: ${p95.toFixed(2)}ms, Error Rate: ${errorRate}%`);
    }

    /**
     * Generate comprehensive quick report
     */
    generateReport() {
        const duration = metrics.endTime - metrics.startTime;
        const sortedTimes = [...metrics.responseTimes].sort((a, b) => a - b);

        const report = {
            phase: 'Quick Test for 1,000 Users',
            summary: {
                totalRequests: metrics.totalRequests,
                successfulRequests: metrics.successfulRequests,
                failedRequests: metrics.failedRequests,
                successRate: ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2),
                durationMs: duration,
                durationMinutes: (duration / 1000 / 60).toFixed(2),
                requestsPerSecond: (metrics.totalRequests / (duration / 1000)).toFixed(2)
            },
            performance: {
                averageResponseTime: sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length,
                minResponseTime: Math.min(...sortedTimes),
                maxResponseTime: Math.max(...sortedTimes),
                p50: sortedTimes[Math.floor(sortedTimes.length * 0.50)],
                p90: sortedTimes[Math.floor(sortedTimes.length * 0.90)],
                p95: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
                p99: sortedTimes[Math.floor(sortedTimes.length * 0.99)]
            },
            requirements: {
                responseTimeUnder50ms: sortedTimes.filter(t => t <= 50).length / sortedTimes.length * 100,
                errorRate: (metrics.failedRequests / metrics.totalRequests) * 100,
                targetErrorRate: 0,
                targetResponseTime: 50
            },
            errors: metrics.errors,
            compliance: {
                responseTimeCompliant: sortedTimes.filter(t => t <= 50).length === sortedTimes.length,
                errorRateCompliant: metrics.failedRequests === 0,
                overallCompliant: null
            }
        };

        // Set overall compliance
        report.compliance.overallCompliant =
            report.compliance.responseTimeCompliant &&
            report.compliance.errorRateCompliant;

        return report;
    }
}

// Execute quick load test
async function executeQuickTest() {
    const tester = new QuickLoadTester(LOAD_TEST_CONFIG);

    try {
        const results = await tester.startLoadTest();

        console.log('\n📋 QUICK LOAD TEST RESULTS');
        console.log('================================');
        console.log(JSON.stringify(results, null, 2));

        // validation
        console.log('\n🎯 COMPLIANCE ASSESSMENT');
        console.log('========================');
        console.log(`Response Time < 50ms: ${results.compliance.responseTimeCompliant ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Error Rate = 0%: ${results.compliance.errorRateCompliant ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Overall Compliance: ${results.compliance.overallCompliant ? '✅ PASS' : '❌ FAIL'}`);

        // Save results to file
        const fs = require('fs');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `quick-load-test-results-${timestamp}.json`;
        fs.writeFileSync(filename, JSON.stringify(results, null, 2));
        console.log(`\n💾 Results saved to: ${filename}`);

        process.exit(results.compliance.overallCompliant ? 0 : 1);

    } catch (error) {
        console.error('❌ Quick test failed:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping quick test...');
    process.exit(0);
});

// Run the quick test
if (require.main === module) {
    executeQuickTest();
}

module.exports = { QuickLoadTester, LOAD_TEST_CONFIG };
