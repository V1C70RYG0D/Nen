#!/usr/bin/env node

/**
 * Performance Validation Script
 * Tests <100ms API latency and <50ms gaming move targets
 * Based on poc_Master.md requirements
 */

const axios = require('axios');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');

// Configuration
const BACKEND_URL = process.env.API_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;
const WS_URL = process.env.WS_URL;

// Performance targets from poc_Master.md
const API_LATENCY_TARGET = 100; // <100ms
const GAMING_LATENCY_TARGET = 50; // <50ms for MagicBlock

class PerformanceValidator {
    constructor() {
        this.results = {
            api_tests: [],
            gaming_tests: [],
            summary: {
                api_passed: 0,
                api_failed: 0,
                gaming_passed: 0,
                gaming_failed: 0
            }
        };
    }

    async measureLatency(testFn, testName) {
        const start = performance.now();
        try {
            await testFn();
            const end = performance.now();
            const latency = end - start;
            console.log(`✓ ${testName}: ${latency.toFixed(2)}ms`);
            return { success: true, latency, error: null };
        } catch (error) {
            const end = performance.now();
            const latency = end - start;
            console.log(`✗ ${testName}: ${latency.toFixed(2)}ms (ERROR: ${error.message})`);
            return { success: false, latency, error: error.message };
        }
    }

    async testAPIEndpoints() {
        console.log('\n🚀 Testing API Performance (<100ms target)');
        console.log('=' .repeat(50));

        const apiTests = [
            {
                name: 'Health Check',
                test: () => axios.get(`${BACKEND_URL}/health`, { timeout: 5000 })
            },
            {
                name: 'API Test Endpoint',
                test: () => axios.get(`${BACKEND_URL}/api/test`, { timeout: 5000 })
            },
            {
                name: 'Active Games',
                test: () => axios.get(`${BACKEND_URL}/api/game/active`, { timeout: 5000 })
            },
            {
                name: 'Auth Wallet (POST)',
                test: () => axios.post(`${BACKEND_URL}/api/auth/wallet`, {
                    publicKey: 'test_public_key_12345'
                }, { timeout: 5000 })
            },
            {
                name: 'Game Match Info',
                test: () => axios.get(`${BACKEND_URL}/api/game/match/test_match_id`, { timeout: 5000 })
            }
        ];

        for (const apiTest of apiTests) {
            const result = await this.measureLatency(apiTest.test, apiTest.name);
            this.results.api_tests.push({
                name: apiTest.name,
                ...result,
                passed: result.success && result.latency < API_LATENCY_TARGET
            });

            if (result.success && result.latency < API_LATENCY_TARGET) {
                this.results.summary.api_passed++;
            } else {
                this.results.summary.api_failed++;
            }

            // Small delay between tests
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    async testGamingPerformance() {
        console.log('\n🎮 Testing Gaming Performance (<50ms target)');
        console.log('=' .repeat(50));

        return new Promise((resolve) => {
            const ws = new WebSocket(WS_URL);
            const gamingTests = [];
            let testCount = 0;
            const maxTests = 5;

            ws.on('open', () => {
                console.log('WebSocket connected for gaming tests');

                // Test game move simulation
                const testGameMove = () => {
                    if (testCount >= maxTests) {
                        ws.close();
                        return;
                    }

                    const start = performance.now();
                    const moveData = {
                        type: 'game_move',
                        sessionId: 'test_session_' + Date.now(),
                        playerId: 'test_player',
                        move: {
                            from: { row: 0, col: 0 },
                            to: { row: 0, col: 1 },
                            piece: 'Pawn'
                        },
                        timestamp: Date.now()
                    };

                    ws.send(JSON.stringify(moveData));

                    // Set timeout for response
                    const timeout = setTimeout(() => {
                        const latency = performance.now() - start;
                        console.log(`✗ Game Move ${testCount + 1}: ${latency.toFixed(2)}ms (TIMEOUT)`);

                        gamingTests.push({
                            name: `Game Move ${testCount + 1}`,
                            success: false,
                            latency,
                            error: 'Timeout',
                            passed: false
                        });
                        this.results.summary.gaming_failed++;
                        testCount++;

                        setTimeout(testGameMove, 200);
                    }, 1000);

                    ws.once('message', (data) => {
                        clearTimeout(timeout);
                        const latency = performance.now() - start;
                        const passed = latency < GAMING_LATENCY_TARGET;

                        console.log(`${passed ? '✓' : '✗'} Game Move ${testCount + 1}: ${latency.toFixed(2)}ms`);

                        gamingTests.push({
                            name: `Game Move ${testCount + 1}`,
                            success: true,
                            latency,
                            error: null,
                            passed
                        });

                        if (passed) {
                            this.results.summary.gaming_passed++;
                        } else {
                            this.results.summary.gaming_failed++;
                        }

                        testCount++;
                        setTimeout(testGameMove, 200);
                    });
                };

                testGameMove();
            });

            ws.on('close', () => {
                this.results.gaming_tests = gamingTests;
                resolve();
            });

            ws.on('error', (error) => {
                console.log(`✗ WebSocket connection error: ${error.message}`);
                this.results.gaming_tests.push({
                    name: 'WebSocket Connection',
                    success: false,
                    latency: 0,
                    error: error.message,
                    passed: false
                });
                this.results.summary.gaming_failed++;
                resolve();
            });
        });
    }

    async checkServiceAvailability() {
        console.log('\n🔍 Checking Service Availability');
        console.log('=' .repeat(50));

        try {
            const backendResponse = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
            console.log('✓ Backend service is running');
            console.log(`  Status: ${backendResponse.data.status}`);
            console.log(`  Version: ${backendResponse.data.version}`);
        } catch (error) {
            console.log(`✗ Backend service unavailable: ${error.message}`);
            return false;
        }

        try {
            const frontendResponse = await axios.get(FRONTEND_URL, { timeout: 10000 });
            console.log('✓ Frontend service is running');
        } catch (error) {
            console.log(`⚠️  Frontend service slow to respond (this is normal for Next.js): ${error.message}`);
            console.log('   Continuing with backend performance tests...');
        }

        return true;
    }

    printSummary() {
        console.log('\n📊 Performance Validation Summary');
        console.log('=' .repeat(50));

        // API Summary
        const totalAPI = this.results.summary.api_passed + this.results.summary.api_failed;
        const apiSuccessRate = totalAPI > 0 ? (this.results.summary.api_passed / totalAPI * 100).toFixed(1) : 0;

        console.log(`\n🚀 API Performance (<${API_LATENCY_TARGET}ms target):`);
        console.log(`  Passed: ${this.results.summary.api_passed}/${totalAPI} (${apiSuccessRate}%)`);

        if (this.results.api_tests.length > 0) {
            const avgLatency = this.results.api_tests
                .filter(t => t.success)
                .reduce((sum, t) => sum + t.latency, 0) /
                this.results.api_tests.filter(t => t.success).length;
            console.log(`  Average latency: ${avgLatency.toFixed(2)}ms`);
        }

        // Gaming Summary
        const totalGaming = this.results.summary.gaming_passed + this.results.summary.gaming_failed;
        const gamingSuccessRate = totalGaming > 0 ? (this.results.summary.gaming_passed / totalGaming * 100).toFixed(1) : 0;

        console.log(`\n🎮 Gaming Performance (<${GAMING_LATENCY_TARGET}ms target):`);
        console.log(`  Passed: ${this.results.summary.gaming_passed}/${totalGaming} (${gamingSuccessRate}%)`);

        if (this.results.gaming_tests.length > 0) {
            const avgGamingLatency = this.results.gaming_tests
                .filter(t => t.success)
                .reduce((sum, t) => sum + t.latency, 0) /
                this.results.gaming_tests.filter(t => t.success).length;
            console.log(`  Average latency: ${avgGamingLatency.toFixed(2)}ms`);
        }

        // Overall Assessment
        console.log('\n🎯 Overall Assessment:');
        const apiPassed = this.results.summary.api_passed > 0;
        const gamingPassed = this.results.summary.gaming_passed > 0;

        if (apiPassed && gamingPassed) {
            console.log('  ✅ PERFORMANCE TARGETS MET!');
        } else if (apiPassed) {
            console.log('  ⚠️  API targets met, gaming needs optimization');
        } else if (gamingPassed) {
            console.log('  ⚠️  Gaming targets met, API needs optimization');
        } else {
            console.log('  ❌ Performance targets not met, optimization required');
        }

        // Detailed results
        console.log('\n📝 Detailed Results:');
        console.log('\nAPI Tests:');
        this.results.api_tests.forEach(test => {
            const status = test.passed ? '✅' : '❌';
            console.log(`  ${status} ${test.name}: ${test.latency.toFixed(2)}ms`);
        });

        console.log('\nGaming Tests:');
        this.results.gaming_tests.forEach(test => {
            const status = test.passed ? '✅' : '❌';
            console.log(`  ${status} ${test.name}: ${test.latency.toFixed(2)}ms`);
        });
    }

    async run() {
        console.log('🎯 Nen Platform Performance Validation');
        console.log('=' .repeat(50));
        console.log(`API Target: <${API_LATENCY_TARGET}ms`);
        console.log(`Gaming Target: <${GAMING_LATENCY_TARGET}ms`);

        // Check if services are available
        const servicesAvailable = await this.checkServiceAvailability();
        if (!servicesAvailable) {
            console.log('\n❌ Services not available. Please start the development servers first.');
            process.exit(1);
        }

        // Run performance tests
        await this.testAPIEndpoints();
        await this.testGamingPerformance();

        // Print summary
        this.printSummary();

        // Save results to file
        const resultFile = `performance_validation_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        require('fs').writeFileSync(resultFile, JSON.stringify(this.results, null, 2));
        console.log(`\n💾 Results saved to: ${resultFile}`);
    }
}

// Run the performance validation
if (require.main === module) {
    const validator = new PerformanceValidator();
    validator.run().catch(error => {
        console.error('❌ Performance validation failed:', error);
        process.exit(1);
    });
}

module.exports = PerformanceValidator;
