/**
 * Production Scale Testing Suite
 * Comprehensive load testing for target user volumes with geographic distribution
 */

const WebSocket = require('ws');
const https = require('https');
const { performance } = require('perf_hooks');

class ProductionLoadTester {
    constructor(config = {}) {
        this.config = {
            // Target Production Volumes
            targetUsers: config.targetUsers || 10000,
            concurrentConnections: config.concurrentConnections || 1000,
            testDuration: config.testDuration || 300000, // 5 minutes
            regions: config.regions || ['us-east', 'us-west', 'eu-central', 'asia-pacific'],

            // Performance Targets
            latencyTargets: {
                local: 20, // ms
                regional: 50, // ms
                global: 100 // ms
            },

            // Load Distribution
            userDistribution: {
                'us-east': 0.35,
                'us-west': 0.25,
                'eu-central': 0.30,
                'asia-pacific': 0.10
            },

            // Test Scenarios
            scenarios: [
                'connection_surge',
                'sustained_load',
                'peak_traffic',
                'geographic_failover',
                'ai_match_load'
            ],

            // Endpoints
            baseUrls: {
                'us-east': 'wss://nen-us-east.magicblock.com',
                'us-west': 'wss://nen-us-west.magicblock.com',
                'eu-central': 'wss://nen-eu-central.magicblock.com',
                'asia-pacific': 'wss://nen-asia-pacific.magicblock.com'
            }
        };

        this.metrics = {
            connections: {
                successful: 0,
                failed: 0,
                total: 0
            },
            latency: {
                connect: [],
                message: [],
                gameMove: []
            },
            throughput: {
                messagesPerSecond: 0,
                movesPerSecond: 0,
                dataTransferred: 0
            },
            errors: {
                connection: [],
                timeout: [],
                protocol: []
            },
            regional: {}
        };

        this.activeConnections = new Map();
        this.testResults = new Map();
    }

    /**
     * Initialize production load testing
     */
    async initialize() {
        console.log('🚀 Initializing Production Scale Testing');
        console.log(`Target Users: ${this.config.targetUsers.toLocaleString()}`);
        console.log(`Concurrent Connections: ${this.config.concurrentConnections.toLocaleString()}`);
        console.log(`Test Duration: ${this.config.testDuration / 1000}s`);

        // Initialize regional metrics
        this.config.regions.forEach(region => {
            this.metrics.regional[region] = {
                connections: 0,
                latency: [],
                errors: 0,
                throughput: 0
            };
        });

        return true;
    }

    /**
     * Execute comprehensive load testing scenarios
     */
    async executeLoadTests() {
        console.log('\n📊 Starting Production Load Testing Scenarios');

        const testResults = new Map();

        for (const scenario of this.config.scenarios) {
            console.log(`\n🔄 Running Scenario: ${scenario}`);
            const result = await this.runScenario(scenario);
            testResults.set(scenario, result);

            // Cool down between scenarios
            await this.delay(5000);
        }

        return testResults;
    }

    /**
     * Run specific load testing scenario
     */
    async runScenario(scenario) {
        const startTime = Date.now();

        switch (scenario) {
            case 'connection_surge':
                return await this.testConnectionSurge();
            case 'sustained_load':
                return await this.testSustainedLoad();
            case 'peak_traffic':
                return await this.testPeakTraffic();
            case 'geographic_failover':
                return await this.testGeographicFailover();
            case 'ai_match_load':
                return await this.testAIMatchLoad();
            default:
                throw new Error(`Unknown scenario: ${scenario}`);
        }
    }

    /**
     * Test connection surge scenario
     */
    async testConnectionSurge() {
        console.log('  📈 Testing connection surge (rapid ramp-up)');

        const connections = [];
        const surgeTarget = Math.min(this.config.concurrentConnections, 2000);
        const batchSize = 50;
        const batchDelay = 100; // ms

        for (let i = 0; i < surgeTarget; i += batchSize) {
            const batch = Math.min(batchSize, surgeTarget - i);
            const batchPromises = [];

            for (let j = 0; j < batch; j++) {
                const region = this.selectRegion();
                batchPromises.push(this.createConnection(region, `surge_${i + j}`));
            }

            const batchResults = await Promise.allSettled(batchPromises);
            connections.push(...batchResults);

            if (i + batch < surgeTarget) {
                await this.delay(batchDelay);
            }
        }

        // Maintain connections for test duration
        await this.delay(30000); // 30 seconds

        // Close connections
        await this.closeAllConnections();

        return {
            scenario: 'connection_surge',
            target: surgeTarget,
            successful: connections.filter(r => r.status === 'fulfilled').length,
            failed: connections.filter(r => r.status === 'rejected').length,
            duration: Date.now() - performance.now()
        };
    }

    /**
     * Test sustained load scenario
     */
    async testSustainedLoad() {
        console.log('  ⏱️ Testing sustained load (long duration)');

        const sustainedTarget = Math.floor(this.config.concurrentConnections * 0.8);
        const testDuration = this.config.testDuration;

        // Gradually ramp up to target
        const rampUpTime = 60000; // 1 minute
        const rampUpSteps = 20;
        const stepSize = sustainedTarget / rampUpSteps;
        const stepDelay = rampUpTime / rampUpSteps;

        for (let step = 0; step < rampUpSteps; step++) {
            const targetConnections = Math.floor((step + 1) * stepSize);
            await this.maintainConnectionCount(targetConnections);
            await this.delay(stepDelay);
        }

        // Maintain sustained load
        const sustainedStart = Date.now();
        console.log(`  🔄 Maintaining ${sustainedTarget} connections for ${testDuration / 1000}s`);

        const metricsInterval = setInterval(() => {
            this.logMetrics();
        }, 10000); // Log every 10 seconds

        await this.delay(testDuration);
        clearInterval(metricsInterval);

        await this.closeAllConnections();

        return {
            scenario: 'sustained_load',
            target: sustainedTarget,
            duration: Date.now() - sustainedStart,
            avgLatency: this.calculateAverageLatency(),
            throughput: this.calculateThroughput()
        };
    }

    /**
     * Test peak traffic scenario
     */
    async testPeakTraffic() {
        console.log('  🔥 Testing peak traffic simulation');

        const peakTarget = this.config.concurrentConnections;

        // Create base load
        await this.maintainConnectionCount(Math.floor(peakTarget * 0.5));

        // Simulate peak traffic burst
        const burstSize = Math.floor(peakTarget * 0.5);
        const burstConnections = [];

        for (let i = 0; i < burstSize; i += 100) {
            const batch = Math.min(100, burstSize - i);
            const batchPromises = [];

            for (let j = 0; j < batch; j++) {
                const region = this.selectRegion();
                batchPromises.push(this.createConnection(region, `peak_${i + j}`));
            }

            const results = await Promise.allSettled(batchPromises);
            burstConnections.push(...results);

            // Simulate game activity during peak
            await this.simulateGameActivity(50); // 50 concurrent games
        }

        // Maintain peak for short duration
        await this.delay(60000); // 1 minute

        await this.closeAllConnections();

        return {
            scenario: 'peak_traffic',
            peak: peakTarget,
            successful: burstConnections.filter(r => r.status === 'fulfilled').length,
            avgLatency: this.calculateAverageLatency()
        };
    }

    /**
     * Test geographic failover scenario
     */
    async testGeographicFailover() {
        console.log('  🌍 Testing geographic failover');

        // Distribute connections across regions
        const connectionsPerRegion = Math.floor(this.config.concurrentConnections / this.config.regions.length);

        for (const region of this.config.regions) {
            await this.createRegionalConnections(region, connectionsPerRegion);
        }

        // Simulate region failure (disconnect one region)
        const failedRegion = this.config.regions[0];
        console.log(`  ❌ Simulating failure in region: ${failedRegion}`);

        await this.simulateRegionFailure(failedRegion);

        // Wait for failover
        await this.delay(30000);

        // Verify failover success
        const failoverMetrics = await this.verifyFailover(failedRegion);

        await this.closeAllConnections();

        return {
            scenario: 'geographic_failover',
            failedRegion,
            failoverTime: failoverMetrics.failoverTime,
            connectionsMigrated: failoverMetrics.migrated,
            success: failoverMetrics.success
        };
    }

    /**
     * Test AI match load scenario
     */
    async testAIMatchLoad() {
        console.log('  🤖 Testing AI match load');

        const matchTarget = Math.floor(this.config.concurrentConnections / 10); // 10 players per match
        const connections = [];

        // Create connections for AI matches
        for (let i = 0; i < matchTarget * 10; i++) {
            const region = this.selectRegion();
            const connection = await this.createConnection(region, `ai_match_${i}`);
            if (connection) {
                connections.push(connection);
            }
        }

        // Start AI matches
        const matches = [];
        for (let i = 0; i < matchTarget; i++) {
            const match = await this.startAIMatch(i, connections.slice(i * 10, (i + 1) * 10));
            matches.push(match);
        }

        // Run matches for duration
        await this.delay(120000); // 2 minutes

        // Collect match metrics
        const matchMetrics = await this.collectMatchMetrics(matches);

        await this.closeAllConnections();

        return {
            scenario: 'ai_match_load',
            matches: matchTarget,
            avgMoveLatency: matchMetrics.avgMoveLatency,
            throughput: matchMetrics.movesPerSecond,
            success: matchMetrics.completedMatches
        };
    }

    /**
     * Create connection to specific region
     */
    async createConnection(region, id) {
        return new Promise((resolve, reject) => {
            const url = this.config.baseUrls[region] || 'ws://localhost:3001';
            const startTime = performance.now();

            const ws = new WebSocket(url, {
                headers: {
                    'X-User-ID': id,
                    'X-Region': region,
                    'X-Test-Type': 'load-test'
                }
            });

            const timeout = setTimeout(() => {
                ws.terminate();
                reject(new Error('Connection timeout'));
            }, 10000);

            ws.on('open', () => {
                clearTimeout(timeout);
                const latency = performance.now() - startTime;

                this.metrics.connections.successful++;
                this.metrics.latency.connect.push(latency);
                this.metrics.regional[region].connections++;
                this.metrics.regional[region].latency.push(latency);

                this.activeConnections.set(id, { ws, region, id });
                resolve({ ws, region, id, latency });
            });

            ws.on('error', (error) => {
                clearTimeout(timeout);
                this.metrics.connections.failed++;
                this.metrics.errors.connection.push({ region, error: error.message });
                reject(error);
            });

            ws.on('message', (data) => {
                this.handleMessage(id, data);
            });
        });
    }

    /**
     * Handle incoming message
     */
    handleMessage(connectionId, data) {
        try {
            const message = JSON.parse(data);
            const connection = this.activeConnections.get(connectionId);

            if (message.type === 'pong') {
                const latency = Date.now() - message.timestamp;
                this.metrics.latency.message.push(latency);

                if (connection) {
                    this.metrics.regional[connection.region].latency.push(latency);
                }
            }

            if (message.type === 'game_move_response') {
                const latency = Date.now() - message.timestamp;
                this.metrics.latency.gameMove.push(latency);
            }

            this.metrics.throughput.dataTransferred += data.length;

        } catch (error) {
            this.metrics.errors.protocol.push({
                connectionId,
                error: error.message
            });
        }
    }

    /**
     * Select region based on distribution
     */
    selectRegion() {
        const random = Math.random();
        let cumulative = 0;

        for (const [region, probability] of Object.entries(this.config.userDistribution)) {
            cumulative += probability;
            if (random <= cumulative) {
                return region;
            }
        }

        return this.config.regions[0];
    }

    /**
     * Maintain specific connection count
     */
    async maintainConnectionCount(target) {
        const current = this.activeConnections.size;

        if (current < target) {
            const needed = target - current;
            const connections = [];

            for (let i = 0; i < needed; i++) {
                const region = this.selectRegion();
                connections.push(this.createConnection(region, `maintain_${Date.now()}_${i}`));
            }

            await Promise.allSettled(connections);
        } else if (current > target) {
            const excess = current - target;
            const toClose = Array.from(this.activeConnections.keys()).slice(0, excess);

            for (const id of toClose) {
                this.closeConnection(id);
            }
        }
    }

    /**
     * Simulate game activity
     */
    async simulateGameActivity(gameCount) {
        const games = [];

        for (let i = 0; i < gameCount; i++) {
            games.push(this.simulateGame(i));
        }

        await Promise.allSettled(games);
    }

    /**
     * Simulate single game
     */
    async simulateGame(gameId) {
        const connections = Array.from(this.activeConnections.values()).slice(0, 2);
        if (connections.length < 2) {return;}

        const moves = 50; // Average game length

        for (let move = 0; move < moves; move++) {
            const player = connections[move % 2];
            const moveData = {
                type: 'game_move',
                gameId,
                move: {
                    from: [Math.floor(Math.random() * 9), Math.floor(Math.random() * 9)],
                    to: [Math.floor(Math.random() * 9), Math.floor(Math.random() * 9)],
                    piece: Math.floor(Math.random() * 13)
                },
                timestamp: Date.now()
            };

            player.ws.send(JSON.stringify(moveData));
            await this.delay(Math.random() * 2000 + 500); // 500-2500ms between moves
        }
    }

    /**
     * Start AI match
     */
    async startAIMatch(matchId, connections) {
        const matchData = {
            type: 'start_ai_match',
            matchId,
            players: connections.map(c => c.id),
            aiPersonality: ['aggressive', 'defensive', 'balanced'][Math.floor(Math.random() * 3)]
        };

        connections.forEach(conn => {
            if (conn.ws.readyState === WebSocket.OPEN) {
                conn.ws.send(JSON.stringify(matchData));
            }
        });

        return {
            matchId,
            connections,
            startTime: Date.now()
        };
    }

    /**
     * Close all connections
     */
    async closeAllConnections() {
        console.log(`  🔌 Closing ${this.activeConnections.size} connections`);

        for (const [id, connection] of this.activeConnections) {
            this.closeConnection(id);
        }

        this.activeConnections.clear();
    }

    /**
     * Close specific connection
     */
    closeConnection(id) {
        const connection = this.activeConnections.get(id);
        if (connection && connection.ws.readyState === WebSocket.OPEN) {
            connection.ws.close();
        }
        this.activeConnections.delete(id);
    }

    /**
     * Calculate metrics
     */
    calculateAverageLatency() {
        const allLatencies = this.metrics.latency.connect;
        return allLatencies.length > 0
            ? allLatencies.reduce((sum, lat) => sum + lat, 0) / allLatencies.length
            : 0;
    }

    calculateThroughput() {
        const duration = this.config.testDuration / 1000;
        return {
            messagesPerSecond: this.metrics.latency.message.length / duration,
            dataPerSecond: this.metrics.throughput.dataTransferred / duration
        };
    }

    /**
     * Log current metrics
     */
    logMetrics() {
        console.log(`  📊 Active Connections: ${this.activeConnections.size}`);
        console.log(`  📊 Avg Latency: ${this.calculateAverageLatency().toFixed(2)}ms`);
        console.log(`  📊 Success Rate: ${(this.metrics.connections.successful / (this.metrics.connections.successful + this.metrics.connections.failed) * 100).toFixed(2)}%`);
    }

    /**
     * Generate comprehensive test report
     */
    generateReport(testResults) {
        const report = {
            timestamp: new Date().toISOString(),
            configuration: this.config,
            overallMetrics: {
                totalConnections: this.metrics.connections.total,
                successfulConnections: this.metrics.connections.successful,
                failedConnections: this.metrics.connections.failed,
                successRate: (this.metrics.connections.successful / this.metrics.connections.total * 100).toFixed(2) + '%',
                averageLatency: this.calculateAverageLatency().toFixed(2) + 'ms',
                throughput: this.calculateThroughput()
            },
            regionalMetrics: this.metrics.regional,
            scenarioResults: Object.fromEntries(testResults),
            errors: {
                connectionErrors: this.metrics.errors.connection.length,
                protocolErrors: this.metrics.errors.protocol.length,
                timeoutErrors: this.metrics.errors.timeout.length
            },
            performanceTargets: {
                latencyTargetsMet: this.validateLatencyTargets(),
                throughputTargetsMet: this.validateThroughputTargets(),
                scalabilityTargetsMet: this.validateScalabilityTargets()
            }
        };

        return report;
    }

    /**
     * Validate performance targets
     */
    validateLatencyTargets() {
        const avgLatency = this.calculateAverageLatency();
        return {
            local: avgLatency <= this.config.latencyTargets.local,
            regional: avgLatency <= this.config.latencyTargets.regional,
            global: avgLatency <= this.config.latencyTargets.global
        };
    }

    validateThroughputTargets() {
        const throughput = this.calculateThroughput();
        return {
            messagesPerSecond: throughput.messagesPerSecond >= 100,
            dataPerSecond: throughput.dataPerSecond >= 1024 * 1024 // 1MB/s
        };
    }

    validateScalabilityTargets() {
        return {
            concurrentConnections: this.metrics.connections.successful >= this.config.concurrentConnections * 0.95,
            errorRate: (this.metrics.connections.failed / this.metrics.connections.total) < 0.05
        };
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in other modules
module.exports = ProductionLoadTester;

// CLI execution
if (require.main === module) {
    async function runProductionLoadTest() {
        const config = {
            targetUsers: process.env.LOAD_TEST_TARGET_USERS || 10000,
            concurrentConnections: process.env.LOAD_TEST_CONCURRENT || 1000,
            testDuration: process.env.LOAD_TEST_DURATION || 300000
        };

        const tester = new ProductionLoadTester(config);

        try {
            await tester.initialize();
            const results = await tester.executeLoadTests();
            const report = tester.generateReport(results);

            // Save report
            const fs = require('fs');
            const reportPath = `test-results/load-test-report-${Date.now()}.json`;
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

            console.log('\n✅ Production Load Testing Complete');
            console.log(`📄 Report saved to: ${reportPath}`);
            console.log(`📊 Success Rate: ${report.overallMetrics.successRate}`);
            console.log(`⚡ Average Latency: ${report.overallMetrics.averageLatency}`);

        } catch (error) {
            console.error('❌ Load testing failed:', error);
            process.exit(1);
        }
    }

    runProductionLoadTest();
}
