#!/usr/bin/env node

/**
 * Advanced Load Testing Suite for Nen Platform POC
 * Phase 4.3: Comprehensive Review/Iteration (Days 117-126)
 *
 * Performance targets from POC Master Plan:
 * - API Latency: <100ms (targeting <85ms)
 * - Game Moves: <50ms via MagicBlock (targeting <42ms)
 * - Concurrent Users: 100-1000
 * - Error Rate: <1% (targeting <0.5%)
 * - Geographic Distribution: Multi-region testing
 *


 */

const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');

class AdvancedLoadTester {
  constructor() {
    this.baseUrl = process.env.API_URL;
    this.frontendUrl = process.env.FRONTEND_URL;
    this.wsUrl = process.env.WS_URL;

    this.metrics = {
      apiLatency: [],
      gameMoveLatency: [],
      wsLatency: [],
      errors: 0,
      totalRequests: 0,
      concurrentUsers: 0,
      throughput: 0
    };

    this.testConfig = {
      maxConcurrentUsers: 1000,
      testDurationMs: 30 * 60 * 1000, // 30 minutes
      rampUpTimeMs: 5 * 60 * 1000,    // 5 minutes ramp up
      sustainTimeMs: 20 * 60 * 1000,  // 20 minutes sustain
      rampDownTimeMs: 5 * 60 * 1000   // 5 minutes ramp down
    };
  }

  /**
   * Execute comprehensive load testing following POC Master Plan
   */
  async executeLoadTest() {
    console.log('🚀 Starting Advanced Load Testing for Nen Platform POC');
    console.log(`Target: ${this.testConfig.maxConcurrentUsers} concurrent users`);
    console.log(`Duration: ${this.testConfig.testDurationMs / 1000 / 60} minutes`);
    console.log('Following POC Master Plan Phase 4.3 requirements\n');

    const startTime = performance.now();

    try {
      // Phase 1: System Health Check
      await this.performHealthCheck();

      // Phase 2: Ramp Up Testing
      await this.executeRampUpPhase();

      // Phase 3: Sustained Load Testing
      await this.executeSustainedLoadPhase();

      // Phase 4: Peak Load Testing
      await this.executePeakLoadPhase();

      // Phase 5: WebSocket Real-time Testing
      await this.executeRealTimeTestPhase();

      // Phase 6: Ramp Down
      await this.executeRampDownPhase();

      const endTime = performance.now();
      const totalDuration = (endTime - startTime) / 1000;

      // Generate comprehensive report
      this.generateLoadTestReport(totalDuration);

    } catch (error) {
      console.error('❌ Load testing failed:', error.message);
      throw error;
    }
  }

  /**
   * Pre-test system health validation
   */
  async performHealthCheck() {
    console.log('📊 Phase 1: System Health Check');

    const healthChecks = [
      { name: 'Backend Health', url: `${this.baseUrl}/health` },
      { name: 'Frontend Access', url: this.frontendUrl },
      { name: 'Match API', url: `${this.baseUrl}/api/game/match/test-match-001` },
      { name: 'AI Agents API', url: `${this.baseUrl}/api/ai/agents` },
      { name: 'Betting API', url: `${this.baseUrl}/api/betting/odds` }
    ];

    for (const check of healthChecks) {
      try {
        const startTime = performance.now();
        await this.makeHttpRequest(check.url);
        const endTime = performance.now();
        const latency = endTime - startTime;

        console.log(`✅ ${check.name}: ${latency.toFixed(2)}ms`);

        if (latency > 200) {
          console.warn(`⚠️  ${check.name} latency above 200ms: ${latency.toFixed(2)}ms`);
        }
      } catch (error) {
        console.error(`❌ ${check.name} failed:`, error.message);
        throw new Error(`Health check failed for ${check.name}`);
      }
    }

    console.log('✅ All health checks passed\n');
  }

  /**
   * Ramp up phase: Gradually increase load
   */
  async executeRampUpPhase() {
    console.log('📈 Phase 2: Ramp Up Testing (0 → 100 → 500 users)');

    const phases = [
      { users: 100, duration: 2 * 60 * 1000 },
      { users: 300, duration: 2 * 60 * 1000 },
      { users: 500, duration: 1 * 60 * 1000 }
    ];

    for (const phase of phases) {
      console.log(`Scaling to ${phase.users} concurrent users...`);
      await this.simulateConcurrentUsers(phase.users, phase.duration);

      const avgLatency = this.calculateAverageLatency();
      const errorRate = this.calculateErrorRate();

      console.log(`📊 ${phase.users} users - Avg Latency: ${avgLatency.toFixed(2)}ms, Error Rate: ${(errorRate * 100).toFixed(2)}%`);

      // Validate against POC targets
      if (avgLatency > 100) {
        console.warn(`⚠️  API latency ${avgLatency.toFixed(2)}ms exceeds 100ms target`);
      }
      if (errorRate > 0.01) {
        console.warn(`⚠️  Error rate ${(errorRate * 100).toFixed(2)}% exceeds 1% target`);
      }
    }

    console.log('✅ Ramp up phase completed\n');
  }

  /**
   * Sustained load phase: Maintain steady load
   */
  async executeSustainedLoadPhase() {
    console.log('⚡ Phase 3: Sustained Load Testing (500 users for 10 minutes)');

    const sustainedUsers = 500;
    const duration = 10 * 60 * 1000; // 10 minutes

    console.log(`Maintaining ${sustainedUsers} concurrent users for ${duration / 1000 / 60} minutes...`);

    const startTime = performance.now();
    await this.simulateConcurrentUsers(sustainedUsers, duration);
    const endTime = performance.now();

    const avgLatency = this.calculateAverageLatency();
    const errorRate = this.calculateErrorRate();
    const throughput = this.metrics.totalRequests / ((endTime - startTime) / 1000);

    console.log('📊 Sustained Load Results:');
    console.log(`   - Average Latency: ${avgLatency.toFixed(2)}ms (Target: <100ms)`);
    console.log(`   - Error Rate: ${(errorRate * 100).toFixed(2)}% (Target: <1%)`);
    console.log(`   - Throughput: ${throughput.toFixed(2)} req/sec`);
    console.log(`   - Total Requests: ${this.metrics.totalRequests}`);

    console.log('✅ Sustained load phase completed\n');
  }

  /**
   * Peak load phase: Test maximum capacity
   */
  async executePeakLoadPhase() {
    console.log('🔥 Phase 4: Peak Load Testing (1000 users)');

    const peakUsers = 1000;
    const duration = 5 * 60 * 1000; // 5 minutes

    console.log(`Testing peak capacity with ${peakUsers} concurrent users...`);

    const startTime = performance.now();
    await this.simulateConcurrentUsers(peakUsers, duration);
    const endTime = performance.now();

    const avgLatency = this.calculateAverageLatency();
    const p95Latency = this.calculatePercentileLatency(95);
    const errorRate = this.calculateErrorRate();

    console.log('📊 Peak Load Results:');
    console.log(`   - Average Latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`   - P95 Latency: ${p95Latency.toFixed(2)}ms (Target: <100ms)`);
    console.log(`   - Error Rate: ${(errorRate * 100).toFixed(2)}% (Target: <1%)`);

    // Critical validation for POC success
    if (p95Latency <= 100 && errorRate <= 0.01) {
      console.log('✅ Peak load targets achieved - POC performance validated');
    } else {
      console.warn('⚠️  Peak load targets not met - may require optimization');
    }

    console.log('✅ Peak load phase completed\n');
  }

  /**
   * Real-time WebSocket testing phase
   */
  async executeRealTimeTestPhase() {
    console.log('🌐 Phase 5: Real-time WebSocket Testing (<50ms target)');

    const wsConnections = 100;
    const testDuration = 3 * 60 * 1000; // 3 minutes

    console.log(`Testing ${wsConnections} WebSocket connections for real-time game moves...`);

    const promises = [];
    for (let i = 0; i < wsConnections; i++) {
      promises.push(this.testWebSocketConnection(testDuration));
    }

    await Promise.allSettled(promises);

    const avgWsLatency = this.metrics.wsLatency.reduce((a, b) => a + b, 0) / this.metrics.wsLatency.length;
    const p95WsLatency = this.calculatePercentileLatency(95, this.metrics.wsLatency);

    console.log('📊 Real-time Results:');
    console.log(`   - Average WebSocket Latency: ${avgWsLatency.toFixed(2)}ms`);
    console.log(`   - P95 WebSocket Latency: ${p95WsLatency.toFixed(2)}ms (Target: <50ms)`);
    console.log(`   - Active Connections: ${wsConnections}`);

    if (p95WsLatency <= 50) {
      console.log('✅ Real-time latency target achieved - <50ms validated');
    } else {
      console.warn('⚠️  Real-time latency target not met');
    }

    console.log('✅ Real-time testing phase completed\n');
  }

  /**
   * Ramp down phase: Graceful load reduction
   */
  async executeRampDownPhase() {
    console.log('📉 Phase 6: Ramp Down Testing (1000 → 0 users)');

    const phases = [
      { users: 500, duration: 1 * 60 * 1000 },
      { users: 100, duration: 1 * 60 * 1000 },
      { users: 0, duration: 1 * 60 * 1000 }
    ];

    for (const phase of phases) {
      if (phase.users > 0) {
        console.log(`Scaling down to ${phase.users} concurrent users...`);
        await this.simulateConcurrentUsers(phase.users, phase.duration);
      } else {
        console.log('Graceful shutdown...');
        await this.sleep(phase.duration);
      }
    }

    console.log('✅ Ramp down completed\n');
  }

  /**
   * Simulate concurrent users with realistic behavior
   */
  async simulateConcurrentUsers(userCount, duration) {
    const promises = [];
    const endTime = Date.now() + duration;

    this.metrics.concurrentUsers = userCount;

    for (let i = 0; i < userCount; i++) {
      promises.push(this.simulateUserSession(endTime));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Simulate realistic user session
   */
  async simulateUserSession(endTime) {
    while (Date.now() < endTime) {
      try {
        // Realistic user behavior pattern
        const actions = [
          () => this.testAPIEndpoint('/health'),
          () => this.testAPIEndpoint('/api/game/match/test-match-001'),
          () => this.testAPIEndpoint('/api/ai/agents'),
          () => this.testAPIEndpoint('/api/betting/odds'),
          () => this.testGameMoveLatency()
        ];

        // Weighted random action selection
        const action = actions[Math.floor(Math.random() * actions.length)];
        await action();

        // Think time between actions (realistic user behavior)
        await this.sleep(Math.random() * 2000 + 500);

      } catch (error) {
        this.metrics.errors++;
      }

      this.metrics.totalRequests++;
    }
  }

  /**
   * Test API endpoint latency
   */
  async testAPIEndpoint(endpoint) {
    const startTime = performance.now();

    try {
      await this.makeHttpRequest(`${this.baseUrl}${endpoint}`);
      const endTime = performance.now();
      const latency = endTime - startTime;

      this.metrics.apiLatency.push(latency);
      return latency;

    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Test game move latency (critical for <50ms target)
   */
  async testGameMoveLatency() {
    const startTime = performance.now();

    try {
      const moveData = {
        gameId: 'test-game-001',
        move: { from: 'a1', to: 'a2', piece: 'pawn' },
        playerId: 'test-player'
      };

      await this.makeHttpRequest(`${this.baseUrl}/api/game/move`, 'POST', moveData);
      const endTime = performance.now();
      const latency = endTime - startTime;

      this.metrics.gameMoveLatency.push(latency);
      return latency;

    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Test WebSocket connection for real-time updates
   */
  async testWebSocketConnection(duration) {
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(this.wsUrl);
        const startTime = Date.now();
        const endTime = startTime + duration;

        ws.on('open', () => {
          const sendMessage = () => {
            if (Date.now() < endTime && ws.readyState === WebSocket.OPEN) {
              const messageStartTime = performance.now();

              ws.send(JSON.stringify({
                type: 'game_move',
                data: { gameId: 'test-game', move: 'test-move' }
              }));

              ws.once('message', () => {
                const messageEndTime = performance.now();
                const latency = messageEndTime - messageStartTime;
                this.metrics.wsLatency.push(latency);
              });

              setTimeout(sendMessage, Math.random() * 1000 + 500);
            } else {
              ws.close();
              resolve();
            }
          };

          sendMessage();
        });

        ws.on('error', () => {
          this.metrics.errors++;
          resolve();
        });

      } catch (error) {
        this.metrics.errors++;
        resolve();
      }
    });
  }

  /**
   * Make HTTP request with timeout
   */
  async makeHttpRequest(url, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: method,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Nen-LoadTester/1.0'
        }
      };

      if (data) {
        const jsonData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(jsonData);
      }

      const client = urlObj.protocol === 'https:' ? https : http;
      const req = client.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, data: responseData });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Calculate average latency
   */
  calculateAverageLatency() {
    if (this.metrics.apiLatency.length === 0) {return 0;}
    return this.metrics.apiLatency.reduce((a, b) => a + b, 0) / this.metrics.apiLatency.length;
  }

  /**
   * Calculate percentile latency
   */
  calculatePercentileLatency(percentile, data = null) {
    const latencyData = data || this.metrics.apiLatency;
    if (latencyData.length === 0) {return 0;}

    const sorted = latencyData.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Calculate error rate
   */
  calculateErrorRate() {
    return this.metrics.totalRequests > 0 ? this.metrics.errors / this.metrics.totalRequests : 0;
  }

  /**
   * Generate comprehensive load test report
   */
  generateLoadTestReport(totalDuration) {
    const avgLatency = this.calculateAverageLatency();
    const p95Latency = this.calculatePercentileLatency(95);
    const p99Latency = this.calculatePercentileLatency(99);
    const errorRate = this.calculateErrorRate();
    const throughput = this.metrics.totalRequests / totalDuration;

    const avgGameMoveLatency = this.metrics.gameMoveLatency.length > 0
      ? this.metrics.gameMoveLatency.reduce((a, b) => a + b, 0) / this.metrics.gameMoveLatency.length
      : 0;

    const avgWsLatency = this.metrics.wsLatency.length > 0
      ? this.metrics.wsLatency.reduce((a, b) => a + b, 0) / this.metrics.wsLatency.length
      : 0;

    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE LOAD TEST REPORT - NEN PLATFORM POC');
    console.log('='.repeat(80));
    console.log(`Test Duration: ${(totalDuration / 60).toFixed(2)} minutes`);
    console.log(`Max Concurrent Users: ${this.testConfig.maxConcurrentUsers}`);
    console.log(`Total Requests: ${this.metrics.totalRequests}`);
    console.log(`Total Errors: ${this.metrics.errors}`);
    console.log('');

    console.log('🎯 PERFORMANCE METRICS (POC Master Plan Targets)');
    console.log('-'.repeat(50));
    console.log(`Average API Latency: ${avgLatency.toFixed(2)}ms (Target: <100ms) ${avgLatency <= 100 ? '✅' : '❌'}`);
    console.log(`P95 API Latency: ${p95Latency.toFixed(2)}ms (Target: <100ms) ${p95Latency <= 100 ? '✅' : '❌'}`);
    console.log(`P99 API Latency: ${p99Latency.toFixed(2)}ms (Target: <200ms) ${p99Latency <= 200 ? '✅' : '❌'}`);
    console.log(`Game Move Latency: ${avgGameMoveLatency.toFixed(2)}ms (Target: <50ms) ${avgGameMoveLatency <= 50 ? '✅' : '❌'}`);
    console.log(`WebSocket Latency: ${avgWsLatency.toFixed(2)}ms (Target: <50ms) ${avgWsLatency <= 50 ? '✅' : '❌'}`);
    console.log(`Error Rate: ${(errorRate * 100).toFixed(3)}% (Target: <1%) ${errorRate <= 0.01 ? '✅' : '❌'}`);
    console.log(`Throughput: ${throughput.toFixed(2)} req/sec`);
    console.log('');

    // POC Success Validation
    const pocTargetsMet =
      avgLatency <= 100 &&
      p95Latency <= 100 &&
      avgGameMoveLatency <= 50 &&
      avgWsLatency <= 50 &&
      errorRate <= 0.01;

    console.log('🏆 POC VALIDATION RESULTS');
    console.log('-'.repeat(30));
    if (pocTargetsMet) {
      console.log('✅ ALL POC PERFORMANCE TARGETS ACHIEVED');
      console.log('✅ System ready for next milestone: User Acceptance Testing');
    } else {
      console.log('⚠️  Some POC targets not met - optimization recommended');
    }

    console.log('\n' + '='.repeat(80));

    // Write detailed report to file
    this.writeReportToFile({
      totalDuration,
      avgLatency,
      p95Latency,
      p99Latency,
      avgGameMoveLatency,
      avgWsLatency,
      errorRate,
      throughput,
      pocTargetsMet
    });
  }

  /**
   * Write detailed report to file
   */
  writeReportToFile(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportContent = `# Nen Platform POC - Advanced Load Test Report
Generated: ${new Date().toISOString()}
Test Duration: ${(results.totalDuration / 60).toFixed(2)} minutes

## Performance Metrics
- Average API Latency: ${results.avgLatency.toFixed(2)}ms (Target: <100ms)
- P95 API Latency: ${results.p95Latency.toFixed(2)}ms (Target: <100ms)
- P99 API Latency: ${results.p99Latency.toFixed(2)}ms (Target: <200ms)
- Game Move Latency: ${results.avgGameMoveLatency.toFixed(2)}ms (Target: <50ms)
- WebSocket Latency: ${results.avgWsLatency.toFixed(2)}ms (Target: <50ms)
- Error Rate: ${(results.errorRate * 100).toFixed(3)}% (Target: <1%)
- Throughput: ${results.throughput.toFixed(2)} req/sec

## POC Validation
- Max Concurrent Users: ${this.testConfig.maxConcurrentUsers}
- Total Requests: ${this.metrics.totalRequests}
- Total Errors: ${this.metrics.errors}
- POC Targets Met: ${results.pocTargetsMet ? 'YES' : 'NO'}

## Next Steps
${results.pocTargetsMet ?
  '✅ Proceed to User Acceptance Testing phase' :
  '⚠️ Address performance issues before UAT'}
`;

    require('fs').writeFileSync(`load-test-report-${timestamp}.md`, reportContent);
    console.log(`📄 Detailed report saved: load-test-report-${timestamp}.md`);
  }

  /**
   * Utility: Sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Execute load testing if run directly
if (require.main === module) {
  const loadTester = new AdvancedLoadTester();

  loadTester.executeLoadTest()
    .then(() => {
      console.log('🎉 Advanced load testing completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Load testing failed:', error.message);
      process.exit(1);
    });
}

module.exports = AdvancedLoadTester;
