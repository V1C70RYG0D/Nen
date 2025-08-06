#!/usr/bin/env node

/**
 * Optimized Load Testing Script for 1,000 Users
 * Tests the system with 1,000 concurrent users
 * Optimized for performance and memory usage
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Load test configuration
const LOAD_TEST_CONFIG = {
    baseUrl: process.env.LOAD_TEST_BASE_URL || process.env.TEST_API_BASE_URL || 'http://localhost:5002',
    totalUsers: 1000,
    durationMs: 300000, // 5 minutes for quick results
    rampUpMs: 30000,    // 30 seconds ramp-up
    requestInterval: 5000, // 5 seconds between requests per user
    endpoints: [
        { method: 'GET', path: '/health', weight: 30 },
        { method: 'GET', path: '/api/v1/ai/agents', weight: 25 },
        { method: 'GET', path: '/api/metrics', weight: 20 },
        { method: 'GET', path: '/api/v1/betting/odds/test-match', weight: 25 }
    ]
};

// Optimized metrics tracking
const metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    responseTimeSum: 0,
    minResponseTime: Number.MAX_VALUE,
    maxResponseTime: 0,
    responseTimes50: [],
    responseTimes95: [],
    errors: new Map(),
    startTime: 0,
    endTime: 0
};

class OptimizedLoadTester {
    constructor(config) {
        this.config = config;
        this.activeUsers = 0;
        this.isRunning = false;
        this.userPromises = [];
        this.sampleRate = 0.1; // Sample 10% for percentile calculations
    }

    async startLoadTest() {
        console.log('🚀 Starting Optimized Load Test for 1,000 Users');
        console.log(`Configuration:
        - Target Users: ${this.config.totalUsers}
        - Duration: ${this.config.durationMs / 1000 / 60} minutes
        - Target Response Time: <50ms
        - Target Error Rate: 0%
        `);

        metrics.startTime = performance.now();
        this.isRunning = true;

        await this.rampUpUsers();
        await this.waitForTestCompletion();

        this.isRunning = false;
        await Promise.allSettled(this.userPromises);

        metrics.endTime = performance.now();

        return this.generateOptimizedReport();
    }

    async rampUpUsers() {
        const rampUpInterval = this.config.rampUpMs / this.config.totalUsers;

        for (let i = 0; i < this.config.totalUsers; i++) {
            if (!this.isRunning) {break;}

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

    async simulateUser(userId) {
        while (this.isRunning) {
            try {
                const endpoint = this.selectEndpoint();
                await this.makeOptimizedRequest(endpoint, userId);

                await new Promise(resolve =>
                    setTimeout(resolve, this.config.requestInterval)
                );
            } catch (error) {
                // Continue simulation
            }
        }
    }

    selectEndpoint() {
        const random = Math.random() * 100;
        let cumulative = 0;

        for (const endpoint of this.config.endpoints) {
            cumulative += endpoint.weight;
            if (random <= cumulative) {
                return endpoint;
            }
        }

        return this.config.endpoints[0];
    }

    async makeOptimizedRequest(endpoint, userId) {
        const startTime = performance.now();
        metrics.totalRequests++;

        try {
            const response = await axios({
                method: endpoint.method,
                url: `${this.config.baseUrl}${endpoint.path}`,
                timeout: 10000,
                validateStatus: () => true
            });

            const endTime = performance.now();
            const responseTime = endTime - startTime;

            // Update optimized metrics
            this.updateMetrics(responseTime, response.status, endpoint.path);

        } catch (error) {
            const endTime = performance.now();
            const responseTime = endTime - startTime;

            this.updateMetrics(responseTime, 0, endpoint.path, error);
        }
    }

    updateMetrics(responseTime, statusCode, path, error = null) {
        metrics.responseTimeSum += responseTime;
        metrics.minResponseTime = Math.min(metrics.minResponseTime, responseTime);
        metrics.maxResponseTime = Math.max(metrics.maxResponseTime, responseTime);

        // Sample responses for percentile calculation
        if (Math.random() < this.sampleRate) {
            metrics.responseTimes50.push(responseTime);
            if (Math.random() < 0.2) { // 2% of total for 95th percentile
                metrics.responseTimes95.push(responseTime);
            }
        }

        if (statusCode >= 200 && statusCode < 300) {
            metrics.successfulRequests++;

            if (responseTime > 50) {
                console.warn(`⚠️  Response time ${responseTime.toFixed(2)}ms > 50ms for ${path}`);
            }
        } else {
            metrics.failedRequests++;
            const errorKey = error ? error.code : `HTTP_${statusCode}`;
            metrics.errors.set(errorKey, (metrics.errors.get(errorKey) || 0) + 1);
        }
    }

    async waitForTestCompletion() {
        console.log(`🕐 Running test for ${this.config.durationMs / 1000 / 60} minutes...`);

        const reportInterval = 60000; // Report every minute
        const totalIntervals = this.config.durationMs / reportInterval;

        for (let i = 0; i < totalIntervals; i++) {
            if (!this.isRunning) {break;}

            await new Promise(resolve => setTimeout(resolve, reportInterval));

            const elapsed = (i + 1) * reportInterval / 1000 / 60;
            const progress = ((i + 1) / totalIntervals * 100).toFixed(1);

            console.log(`📊 Progress: ${progress}% (${elapsed} min) - Active Users: ${this.activeUsers}`);
            this.printInterimMetrics();
        }
    }

    printInterimMetrics() {
        if (metrics.totalRequests === 0) {return;}

        const avgResponseTime = metrics.responseTimeSum / metrics.totalRequests;
        const errorRate = (metrics.failedRequests / metrics.totalRequests * 100).toFixed(2);

        console.log(`   Requests: ${metrics.totalRequests}, Avg Response: ${avgResponseTime.toFixed(2)}ms, Error Rate: ${errorRate}%`);
    }

    generateOptimizedReport() {
        const duration = metrics.endTime - metrics.startTime;

        // Calculate percentiles from samples
        metrics.responseTimes50.sort((a, b) => a - b);
        metrics.responseTimes95.sort((a, b) => a - b);

        const p50 = metrics.responseTimes50.length > 0 ?
            metrics.responseTimes50[Math.floor(metrics.responseTimes50.length * 0.5)] : 0;
        const p95 = metrics.responseTimes95.length > 0 ?
            metrics.responseTimes95[Math.floor(metrics.responseTimes95.length * 0.95)] : 0;

        const avgResponseTime = metrics.totalRequests > 0 ?
            metrics.responseTimeSum / metrics.totalRequests : 0;

        const report = {
            phase: 'Phase 1: 1,000 Users Load Test',
            timestamp: new Date().toISOString(),
            summary: {
                totalRequests: metrics.totalRequests,
                successfulRequests: metrics.successfulRequests,
                failedRequests: metrics.failedRequests,
                successRate: parseFloat(((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)),
                durationMs: Math.round(duration),
                durationMinutes: parseFloat((duration / 1000 / 60).toFixed(2)),
                requestsPerSecond: parseFloat((metrics.totalRequests / (duration / 1000)).toFixed(2))
            },
            performance: {
                averageResponseTime: parseFloat(avgResponseTime.toFixed(2)),
                minResponseTime: parseFloat(metrics.minResponseTime.toFixed(2)),
                maxResponseTime: parseFloat(metrics.maxResponseTime.toFixed(2)),
                p50: parseFloat(p50.toFixed(2)),
                p95: parseFloat(p95.toFixed(2))
            },
            requirements: {
                responseTimeUnder50ms: parseFloat(((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)),
                errorRate: parseFloat(((metrics.failedRequests / metrics.totalRequests) * 100).toFixed(2)),
                targetErrorRate: 0,
                targetResponseTime: 50
            },
            errors: Object.fromEntries(metrics.errors),
            compliance: {
                responseTimeCompliant: avgResponseTime <= 50 && p95 <= 50,
                errorRateCompliant: metrics.failedRequests === 0,
                overallCompliant: false
            }
        };

        report.compliance.overallCompliant =
            report.compliance.responseTimeCompliant &&
            report.compliance.errorRateCompliant;

        return report;
    }
}

async function executeLoadTest() {
    const tester = new OptimizedLoadTester(LOAD_TEST_CONFIG);

    try {
        const results = await tester.startLoadTest();

        console.log('\n📋 PHASE 1 LOAD TEST RESULTS (1,000 USERS)');
        console.log('============================================');
        console.log(JSON.stringify(results, null, 2));

        console.log('\n🎯 COMPLIANCE ASSESSMENT');
        console.log('========================');
        console.log(`Response Time < 50ms: ${results.compliance.responseTimeCompliant ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Error Rate = 0%: ${results.compliance.errorRateCompliant ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Overall Compliance: ${results.compliance.overallCompliant ? '✅ PASS' : '❌ FAIL'}`);

        console.log('\n📈 PERFORMANCE SUMMARY');
        console.log('======================');
        console.log(`• Total Requests: ${results.summary.totalRequests.toLocaleString()}`);
        console.log(`• Success Rate: ${results.summary.successRate}%`);
        console.log(`• Average Response Time: ${results.performance.averageResponseTime}ms`);
        console.log(`• P95 Response Time: ${results.performance.p95}ms`);
        console.log(`• Requests/Second: ${results.summary.requestsPerSecond}`);
        console.log(`• Duration: ${results.summary.durationMinutes} minutes`);

        // Save results
        const fs = require('fs');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `phase1-1000-users-results-${timestamp}.json`;
        fs.writeFileSync(filename, JSON.stringify(results, null, 2));
        console.log(`\n💾 Results saved to: ${filename}`);

        process.exit(results.compliance.overallCompliant ? 0 : 1);

    } catch (error) {
        console.error('❌ Load test failed:', error.message);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping load test...');
    process.exit(0);
});

if (require.main === module) {
    executeLoadTest();
}

module.exports = { OptimizedLoadTester, LOAD_TEST_CONFIG };
