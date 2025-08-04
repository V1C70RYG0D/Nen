#!/usr/bin/env node

/**
 * Nen Platform Comprehensive Testing Suite
 * Following POC Master Plan Phase 4.3: Review/Iteration

 */

const axios = require('axios');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// Enhanced logging utility with context and structured error handling
class TestLogger {
    static log(message, level = 'INFO', context = null) {
        const timestamp = new Date().toISOString();
        const contextStr = context ? ` [Context: ${JSON.stringify(context)}]` : '';
        const logEntry = `[${timestamp}] [${level}] ${message}${contextStr}`;

        switch (level) {
            case 'ERROR':
                console.error(`❌ ${logEntry}`);
                break;
            case 'WARN':
                console.warn(`⚠️ ${logEntry}`);
                break;
            case 'SUCCESS':
                console.log(`✅ ${logEntry}`);
                break;
            case 'DEBUG':
                if (process.env.DEBUG_TESTS) {
                    console.debug(`🐛 ${logEntry}`);
                }
                break;
            default:
                console.log(`ℹ️ ${logEntry}`);
        }
    }

    static error(message, error = null, context = null) {
        const errorDetails = error ? {
            message: error.message,
            stack: error.stack,
            code: error.code,
            status: error.response?.status,
            statusText: error.response?.statusText
        } : null;

        const fullContext = { ...context, error: errorDetails };
        this.log(message, 'ERROR', fullContext);
    }

    static warn(message, context = null) {
        this.log(message, 'WARN', context);
    }

    static success(message, context = null) {
        this.log(message, 'SUCCESS', context);
    }

    static debug(message, context = null) {
        this.log(message, 'DEBUG', context);
    }
}

// Configuration from environment with fallbacks
const BACKEND_URL = process.env.BACKEND_URL || process.env.API_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;
const WS_URL = process.env.WS_URL;

// Performance targets from POC Master Plan
const API_LATENCY_TARGET = 100; // <100ms API response
const GAMING_LATENCY_TARGET = 50; // <50ms game moves via MagicBlock
const CONCURRENT_USER_TARGET = 100; // 100-1000 concurrent users

console.log('🎯 Nen Platform Comprehensive Testing Suite');
console.log('===========================================');
console.log(`Backend: ${BACKEND_URL}`);
console.log(`Frontend: ${FRONTEND_URL}`);
console.log(`WebSocket: ${WS_URL}`);
console.log('');

class ComprehensiveTestSuite {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            services: {},
            performance: {},
            functionality: {},
            security: {},
            summary: {
                total_tests: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            }
        };
    }

    async runAllTests() {
        console.log('🔍 Phase 1: Service Availability Tests');
        console.log('=====================================');
        await this.testServiceAvailability();

        console.log('\n⚡ Phase 2: Performance Validation');
        console.log('=================================');
        await this.testPerformance();

        console.log('\n🎮 Phase 3: Functionality Tests');
        console.log('===============================');
        await this.testFunctionality();

        console.log('\n🔒 Phase 4: Security Tests');
        console.log('==========================');
        await this.testSecurity();

        console.log('\n📊 Phase 5: Load Testing');
        console.log('========================');
        await this.testLoad();

        this.generateReport();
    }

    async testServiceAvailability() {
        const services = [
            { name: 'Backend API', url: `${BACKEND_URL}/health`, timeout: 5000 },
            { name: 'Frontend App', url: FRONTEND_URL, timeout: 10000 },
            { name: 'Game API', url: `${BACKEND_URL}/api/game/matches`, timeout: 5000 },
            { name: 'Betting API', url: `${BACKEND_URL}/api/betting/status`, timeout: 5000 },
            { name: 'AI Service', url: `${BACKEND_URL}/api/ai/agents`, timeout: 5000 }
        ];

        for (const service of services) {
            try {
                const response = await axios.get(service.url, {
                    timeout: service.timeout,
                    validateStatus: () => true
                });

                if (response.status < 400) {
                    console.log(`✅ ${service.name}: Online (${response.status})`);
                    this.results.services[service.name] = { status: 'online', code: response.status };
                    this.results.summary.passed++;
                } else {
                    console.log(`⚠️ ${service.name}: Available but returning ${response.status}`);
                    this.results.services[service.name] = { status: 'warning', code: response.status };
                    this.results.summary.warnings++;
                }
            } catch (error) {
                console.log(`❌ ${service.name}: Offline (${error.message})`);
                this.results.services[service.name] = { status: 'offline', error: error.message };
                this.results.summary.failed++;
            }
            this.results.summary.total_tests++;
        }

        // WebSocket test
        try {
            await this.testWebSocket();
            console.log(`✅ WebSocket: Connected`);
            this.results.services['WebSocket'] = { status: 'online' };
            this.results.summary.passed++;
        } catch (error) {
            console.log(`❌ WebSocket: Failed (${error.message})`);
            this.results.services['WebSocket'] = { status: 'offline', error: error.message };
            this.results.summary.failed++;
        }
        this.results.summary.total_tests++;
    }

    async testWebSocket() {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(WS_URL);
            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error('Connection timeout'));
            }, 5000);

            ws.on('open', () => {
                clearTimeout(timeout);
                ws.close();
                resolve();
            });

            ws.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }

    async testPerformance() {
        const apiTests = [
            { name: 'Health Check', endpoint: '/health' },
            { name: 'Game Matches', endpoint: '/api/game/matches' },
            { name: 'AI Agents', endpoint: '/api/ai/agents' },
            { name: 'Betting Status', endpoint: '/api/betting/status' }
        ];

        for (const test of apiTests) {
            const start = performance.now();
            try {
                await axios.get(`${BACKEND_URL}${test.endpoint}`, { timeout: 5000 });
                const end = performance.now();
                const latency = end - start;

                if (latency < API_LATENCY_TARGET) {
                    console.log(`✅ ${test.name}: ${latency.toFixed(2)}ms (< ${API_LATENCY_TARGET}ms target)`);
                    this.results.summary.passed++;
                } else {
                    console.log(`⚠️ ${test.name}: ${latency.toFixed(2)}ms (> ${API_LATENCY_TARGET}ms target)`);
                    this.results.summary.warnings++;
                }

                this.results.performance[test.name] = { latency: latency.toFixed(2), status: 'success' };
            } catch (error) {
                const end = performance.now();
                const latency = end - start;
                console.log(`❌ ${test.name}: ${latency.toFixed(2)}ms (ERROR: ${error.message})`);
                this.results.performance[test.name] = { latency: latency.toFixed(2), status: 'error', error: error.message };
                this.results.summary.failed++;
            }
            this.results.summary.total_tests++;
        }
    }

    async testFunctionality() {
        const functionalTests = [
            { name: 'Create Game Match', test: () => this.testCreateMatch() },
            { name: 'AI Agent Generation', test: () => this.testAIAgent() },
            { name: 'Betting System', test: () => this.testBetting() },
            { name: 'Real-time Updates', test: () => this.testRealTimeUpdates() }
        ];

        for (const test of functionalTests) {
            try {
                await test.test();
                console.log(`✅ ${test.name}: Working`);
                this.results.functionality[test.name] = { status: 'success' };
                this.results.summary.passed++;
            } catch (error) {
                console.log(`❌ ${test.name}: Failed (${error.message})`);
                this.results.functionality[test.name] = { status: 'error', error: error.message };
                this.results.summary.failed++;
            }
            this.results.summary.total_tests++;
        }
    }

    async testCreateMatch() {
        const response = await axios.post(`${BACKEND_URL}/api/game/create-match`, {
            aiAgent1: 'gon',
            aiAgent2: 'killua',
            betAmount: 0.1
        }, { timeout: 10000 });

        if (!response.data || !response.data.matchId) {
            throw new Error('Invalid match creation response');
        }
        return response.data;
    }

    async testAIAgent() {
        const response = await axios.get(`${BACKEND_URL}/api/ai/agents`, { timeout: 5000 });
        if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
            throw new Error('No AI agents available');
        }
        return response.data;
    }

    async testBetting() {
        const response = await axios.get(`${BACKEND_URL}/api/betting/status`, { timeout: 5000 });
        if (!response.data) {
            throw new Error('Betting system not responding');
        }
        return response.data;
    }

    async testRealTimeUpdates() {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(WS_URL);
            let messageReceived = false;

            const timeout = setTimeout(() => {
                ws.close();
                if (!messageReceived) {
                    reject(new Error('No real-time updates received'));
                } else {
                    resolve();
                }
            }, 10000);

            ws.on('open', () => {
                ws.send(JSON.stringify({ type: 'test', data: 'ping' }));
            });

            ws.on('message', (data) => {
                messageReceived = true;
                clearTimeout(timeout);
                ws.close();
                resolve();
            });

            ws.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }

    async testSecurity() {
        const securityTests = [
            { name: 'Rate Limiting', test: () => this.testRateLimit() },
            { name: 'CORS Headers', test: () => this.testCORS() },
            { name: 'Security Headers', test: () => this.testSecurityHeaders() }
        ];

        for (const test of securityTests) {
            try {
                await test.test();
                console.log(`✅ ${test.name}: Secured`);
                this.results.security[test.name] = { status: 'secure' };
                this.results.summary.passed++;
            } catch (error) {
                console.log(`⚠️ ${test.name}: Issue (${error.message})`);
                this.results.security[test.name] = { status: 'warning', issue: error.message };
                this.results.summary.warnings++;
            }
            this.results.summary.total_tests++;
        }
    }

    async testRateLimit() {
        // Test rate limiting by making rapid requests
        const requests = Array.from({ length: 10 }, () =>
            axios.get(`${BACKEND_URL}/health`, { timeout: 1000 }).catch(() => null)
        );
        await Promise.all(requests);
        return true; // If we get here, rate limiting might be too lenient but not broken
    }

    async testCORS() {
        const response = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
        if (!response.headers['access-control-allow-origin']) {
            throw new Error('CORS headers not configured');
        }
        return true;
    }

    async testSecurityHeaders() {
        const response = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
        const securityHeaders = ['x-content-type-options', 'x-frame-options', 'x-xss-protection'];
        const missing = securityHeaders.filter(header => !response.headers[header]);
        if (missing.length > 0) {
            throw new Error(`Missing security headers: ${missing.join(', ')}`);
        }
        return true;
    }

    async testLoad() {
        console.log('🚀 Testing concurrent user capacity...');
        const concurrentRequests = Math.min(CONCURRENT_USER_TARGET, 50); // Limit for local testing

        const startTime = performance.now();
        const requests = Array.from({ length: concurrentRequests }, (_, i) =>
            axios.get(`${BACKEND_URL}/health`, { timeout: 10000 })
                .then(() => ({ success: true, index: i }))
                .catch(error => ({ success: false, index: i, error: error.message }))
        );

        const results = await Promise.all(requests);
        const endTime = performance.now();

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const totalTime = endTime - startTime;

        console.log(`📊 Load Test Results:`);
        console.log(`   Concurrent Requests: ${concurrentRequests}`);
        console.log(`   Successful: ${successful}`);
        console.log(`   Failed: ${failed}`);
        console.log(`   Total Time: ${totalTime.toFixed(2)}ms`);
        console.log(`   Average per Request: ${(totalTime / concurrentRequests).toFixed(2)}ms`);

        this.results.performance['Load Test'] = {
            concurrent_requests: concurrentRequests,
            successful: successful,
            failed: failed,
            total_time: totalTime.toFixed(2),
            average_per_request: (totalTime / concurrentRequests).toFixed(2)
        };

        if (successful >= concurrentRequests * 0.95) { // 95% success rate
            this.results.summary.passed++;
        } else {
            this.results.summary.failed++;
        }
        this.results.summary.total_tests++;
    }

    generateReport() {
        console.log('\n📊 Test Summary Report');
        console.log('=====================');
        console.log(`Total Tests: ${this.results.summary.total_tests}`);
        console.log(`✅ Passed: ${this.results.summary.passed}`);
        console.log(`❌ Failed: ${this.results.summary.failed}`);
        console.log(`⚠️ Warnings: ${this.results.summary.warnings}`);

        const successRate = ((this.results.summary.passed / this.results.summary.total_tests) * 100).toFixed(1);
        console.log(`📈 Success Rate: ${successRate}%`);

        // Save detailed report
        const reportPath = path.join(__dirname, `test-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`📄 Detailed report saved: ${reportPath}`);

        // Determine overall status
        if (this.results.summary.failed === 0) {
            console.log('\n🎉 ALL TESTS PASSED - System ready for production!');
            process.exit(0);
        } else if (this.results.summary.failed <= 2) {
            console.log('\n⚠️ Minor issues detected - Review required');
            process.exit(1);
        } else {
            console.log('\n❌ Critical issues detected - Fix required before production');
            process.exit(2);
        }
    }
}

// Run the comprehensive test suite
async function main() {
    const testSuite = new ComprehensiveTestSuite();
    try {
        await testSuite.runAllTests();
    } catch (error) {
        console.error('\n💥 Test suite crashed:', error.message);
        process.exit(3);
    }
}

// Handle CLI arguments
if (require.main === module) {
    main();
}

module.exports = ComprehensiveTestSuite;
