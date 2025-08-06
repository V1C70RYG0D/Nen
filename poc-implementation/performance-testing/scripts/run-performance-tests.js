#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const SystemMonitor = require('../monitoring/system-monitor');

/**
 * Comprehensive Performance Test Runner
 * 
 * This script orchestrates all performance testing scenarios:
 * 1. Single user gameplay
 * 2. Concurrent users (10, 100, 1000)
 * 3. Sustained load tests
 * 4. Spike tests
 * 5. WebSocket scalability
 * 6. AI service performance
 * 7. Database performance
 */

class PerformanceTestRunner {
  constructor(options = {}) {
    this.baseDir = path.join(__dirname, '..');
    this.reportsDir = path.join(this.baseDir, 'reports');
    this.k6Dir = path.join(this.baseDir, 'k6');
    this.artilleryDir = path.join(this.baseDir, 'artillery');
    
    this.config = {
      baseUrl: options.baseUrl || 'http://localhost:3001',
      wsUrl: options.wsUrl || 'ws://localhost:3001',
      aiUrl: options.aiUrl || 'http://localhost:5000',
      skipLongTests: options.skipLongTests || false,
      parallel: options.parallel || false,
      ...options
    };

    this.testResults = {};
    this.systemMonitor = null;
    this.startTime = null;

    // Ensure directories exist
    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    [this.reportsDir, path.join(this.reportsDir, 'k6'), path.join(this.reportsDir, 'artillery')].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Run all performance tests
   */
  async runAll() {
    console.log('🚀 Starting Comprehensive Performance Testing Suite');
    console.log('='.repeat(60));
    
    this.startTime = Date.now();
    
    try {
      // Start system monitoring
      await this.startSystemMonitoring();
      
      // Pre-flight checks
      await this.preFlightChecks();
      
      // Run test scenarios
      if (this.config.parallel) {
        await this.runTestsInParallel();
      } else {
        await this.runTestsSequentially();
      }
      
      // Generate comprehensive report
      await this.generateComprehensiveReport();
      
    } catch (error) {
      console.error('❌ Performance testing failed:', error);
      throw error;
    } finally {
      // Stop system monitoring
      if (this.systemMonitor) {
        await this.systemMonitor.stop();
      }
    }
    
    console.log('✅ Performance testing completed successfully');
    console.log(`📊 Reports available in: ${this.reportsDir}`);
  }

  /**
   * Start system resource monitoring
   */
  async startSystemMonitoring() {
    console.log('🔍 Starting system resource monitoring...');
    
    this.systemMonitor = new SystemMonitor({
      interval: 2000, // 2 second intervals during testing
      outputDir: this.reportsDir,
      services: {
        backend: `${this.config.baseUrl}/api/health`,
        ai: `${this.config.aiUrl}/health`
      }
    });
    
    // Start monitoring in background
    this.systemMonitor.start();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Let it initialize
  }

  /**
   * Pre-flight system checks
   */
  async preFlightChecks() {
    console.log('🔧 Running pre-flight system checks...');
    
    const checks = [
      { name: 'Backend Health', url: `${this.config.baseUrl}/api/health` },
      { name: 'AI Service Health', url: `${this.config.aiUrl}/health` },
      { name: 'K6 Installation', command: 'k6 version' },
      { name: 'Artillery Installation', command: 'artillery version' }
    ];

    for (const check of checks) {
      try {
        if (check.url) {
          const response = await fetch(check.url, { timeout: 10000 });
          if (response.status !== 200) {
            throw new Error(`${check.name} returned status ${response.status}`);
          }
          console.log(`  ✅ ${check.name}: OK`);
        } else if (check.command) {
          await this.executeCommand(check.command);
          console.log(`  ✅ ${check.name}: OK`);
        }
      } catch (error) {
        console.warn(`  ⚠️  ${check.name}: ${error.message}`);
        if (check.url) {
          throw new Error(`Required service not available: ${check.name}`);
        }
      }
    }
  }

  /**
   * Run tests sequentially (recommended for accuracy)
   */
  async runTestsSequentially() {
    console.log('📈 Running performance tests sequentially...');
    
    const testSuite = this.getTestSuite();
    
    for (const test of testSuite) {
      console.log(`\n🔄 Running: ${test.name}`);
      console.log('-'.repeat(40));
      
      try {
        const result = await this.executeTest(test);
        this.testResults[test.id] = {
          ...result,
          status: 'completed',
          timestamp: new Date().toISOString()
        };
        console.log(`  ✅ ${test.name} completed`);
        
        // Cool-down period between tests
        if (test.cooldown) {
          console.log(`  ⏳ Cooling down for ${test.cooldown}ms...`);
          await new Promise(resolve => setTimeout(resolve, test.cooldown));
        }
        
      } catch (error) {
        console.error(`  ❌ ${test.name} failed:`, error.message);
        this.testResults[test.id] = {
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  /**
   * Run tests in parallel (faster but may affect resource measurements)
   */
  async runTestsInParallel() {
    console.log('⚡ Running performance tests in parallel...');
    
    const testSuite = this.getTestSuite().filter(t => t.parallelSafe);
    
    const testPromises = testSuite.map(async (test) => {
      try {
        console.log(`🔄 Starting: ${test.name}`);
        const result = await this.executeTest(test);
        this.testResults[test.id] = {
          ...result,
          status: 'completed',
          timestamp: new Date().toISOString()
        };
        console.log(`✅ ${test.name} completed`);
      } catch (error) {
        console.error(`❌ ${test.name} failed:`, error.message);
        this.testResults[test.id] = {
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    });
    
    await Promise.allSettled(testPromises);
  }

  /**
   * Get the complete test suite definition
   */
  getTestSuite() {
    const testSuite = [
      {
        id: 'single-user',
        name: 'Single User Gameplay Test',
        type: 'k6',
        script: 'single-user-gameplay.js',
        duration: '3m',
        parallelSafe: true,
        cooldown: 5000
      },
      {
        id: 'concurrent-10',
        name: 'Concurrent Users - 10',
        type: 'k6',
        script: 'concurrent-users.js',
        env: { TARGET_USERS: '10', TEST_DURATION: '5m' },
        duration: '8m',
        parallelSafe: false,
        cooldown: 10000
      },
      {
        id: 'concurrent-100',
        name: 'Concurrent Users - 100',
        type: 'k6',
        script: 'concurrent-users.js',
        env: { TARGET_USERS: '100', TEST_DURATION: '10m' },
        duration: '15m',
        parallelSafe: false,
        cooldown: 15000
      },
      {
        id: 'websocket-scalability',
        name: 'WebSocket Scalability Test',
        type: 'artillery',
        script: 'websocket-scalability.yml',
        duration: '10m',
        parallelSafe: true,
        cooldown: 8000
      },
      {
        id: 'api-performance',
        name: 'API Performance Test',
        type: 'artillery',
        script: 'api-performance.yml',
        duration: '12m',
        parallelSafe: true,
        cooldown: 5000
      },
      {
        id: 'spike-test',
        name: 'Spike Test',
        type: 'k6',
        script: 'spike-test.js',
        env: { BASELINE_USERS: '20', SPIKE_USERS: '200', SPIKE_DURATION: '2m' },
        duration: '10m',
        parallelSafe: false,
        cooldown: 20000
      }
    ];

    // Add long-running tests if not skipped
    if (!this.config.skipLongTests) {
      testSuite.push(
        {
          id: 'sustained-load',
          name: 'Sustained Load Test',
          type: 'k6',
          script: 'sustained-load.js',
          env: { SUSTAINED_USERS: '50', SUSTAINED_DURATION: '30m' },
          duration: '35m',
          parallelSafe: false,
          cooldown: 30000
        },
        {
          id: 'concurrent-1000',
          name: 'Concurrent Users - 1000',
          type: 'k6',
          script: 'concurrent-users.js',
          env: { TARGET_USERS: '1000', TEST_DURATION: '15m' },
          duration: '20m',
          parallelSafe: false,
          cooldown: 60000
        }
      );
    }

    return testSuite;
  }

  /**
   * Execute individual test
   */
  async executeTest(test) {
    const timestamp = Date.now();
    const outputFile = path.join(this.reportsDir, test.type, `${test.id}-${timestamp}`);
    
    let command;
    let args = [];
    
    if (test.type === 'k6') {
      command = 'k6';
      args = [
        'run',
        '--out', `json=${outputFile}.json`,
        '--summary-export', `${outputFile}-summary.json`
      ];
      
      // Add environment variables
      if (test.env) {
        Object.entries(test.env).forEach(([key, value]) => {
          args.push('-e', `${key}=${value}`);
        });
      }
      
      // Add base URLs
      args.push('-e', `BASE_URL=${this.config.baseUrl}`);
      args.push('-e', `WS_URL=${this.config.wsUrl}`);
      args.push('-e', `AI_URL=${this.config.aiUrl}`);
      
      args.push(path.join(this.k6Dir, test.script));
      
    } else if (test.type === 'artillery') {
      command = 'artillery';
      args = [
        'run',
        '--output', `${outputFile}.json`,
        path.join(this.artilleryDir, test.script)
      ];
    }
    
    console.log(`  🔧 Executing: ${command} ${args.join(' ')}`);
    
    const startTime = Date.now();
    const result = await this.executeCommand(`${command} ${args.join(' ')}`);
    const endTime = Date.now();
    
    return {
      command: `${command} ${args.join(' ')}`,
      duration: endTime - startTime,
      outputFile: `${outputFile}.json`,
      stdout: result.stdout,
      stderr: result.stderr
    };
  }

  /**
   * Execute shell command
   */
  executeCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  /**
   * Generate comprehensive performance report
   */
  async generateComprehensiveReport() {
    console.log('📊 Generating comprehensive performance report...');
    
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    
    const reportData = {
      metadata: {
        timestamp: new Date().toISOString(),
        duration: totalDuration,
        durationFormatted: this.formatDuration(totalDuration),
        configuration: this.config,
        testSuite: this.getTestSuite().map(t => ({ id: t.id, name: t.name, duration: t.duration }))
      },
      results: this.testResults,
      summary: this.generateTestSummary(),
      recommendations: this.generateRecommendations()
    };

    // Save comprehensive report
    const reportFile = path.join(this.reportsDir, `performance-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
    
    // Generate markdown report
    const markdownReport = path.join(this.reportsDir, `performance-test-report-${Date.now()}.md`);
    fs.writeFileSync(markdownReport, this.generateMarkdownReport(reportData));
    
    console.log(`📋 Comprehensive report saved:`);
    console.log(`   JSON: ${reportFile}`);
    console.log(`   Markdown: ${markdownReport}`);
    
    return reportData;
  }

  /**
   * Generate test summary
   */
  generateTestSummary() {
    const completed = Object.values(this.testResults).filter(r => r.status === 'completed').length;
    const failed = Object.values(this.testResults).filter(r => r.status === 'failed').length;
    const total = Object.keys(this.testResults).length;
    
    return {
      total,
      completed,
      failed,
      successRate: total > 0 ? (completed / total) * 100 : 0,
      failedTests: Object.entries(this.testResults)
        .filter(([_, result]) => result.status === 'failed')
        .map(([id, result]) => ({ id, error: result.error }))
    };
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    const summary = this.generateTestSummary();
    
    if (summary.successRate < 100) {
      recommendations.push({
        category: 'Test Execution',
        priority: 'High',
        issue: `${summary.failed} tests failed`,
        recommendation: 'Review failed tests and address underlying issues before production deployment'
      });
    }
    
    // Check for high-load test failures
    const highLoadTests = ['concurrent-100', 'concurrent-1000', 'sustained-load'];
    const highLoadFailures = summary.failedTests.filter(t => highLoadTests.includes(t.id));
    
    if (highLoadFailures.length > 0) {
      recommendations.push({
        category: 'Scalability',
        priority: 'High',
        issue: 'High-load tests failed',
        recommendation: 'System may not handle expected production load. Consider scaling infrastructure or optimizing performance bottlenecks.'
      });
    }
    
    return recommendations;
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(data) {
    return `# Performance Testing Report

## Executive Summary

**Test Execution Date**: ${data.metadata.timestamp}  
**Total Test Duration**: ${data.metadata.durationFormatted}  
**Test Success Rate**: ${data.summary.successRate.toFixed(1)}%  
**Tests Completed**: ${data.summary.completed}/${data.summary.total}

## Test Configuration

- **Backend URL**: ${data.metadata.configuration.baseUrl}
- **WebSocket URL**: ${data.metadata.configuration.wsUrl}  
- **AI Service URL**: ${data.metadata.configuration.aiUrl}
- **Skip Long Tests**: ${data.metadata.configuration.skipLongTests}
- **Parallel Execution**: ${data.metadata.configuration.parallel}

## Test Results Summary

| Test | Status | Duration | Notes |
|------|--------|----------|-------|
${Object.entries(data.results).map(([id, result]) => {
  const testInfo = data.metadata.testSuite.find(t => t.id === id);
  const status = result.status === 'completed' ? '✅' : '❌';
  const duration = result.duration ? this.formatDuration(result.duration) : 'N/A';
  const notes = result.error ? result.error : 'Success';
  return `| ${testInfo?.name || id} | ${status} | ${duration} | ${notes} |`;
}).join('\\n')}

${data.summary.failed > 0 ? `
## Failed Tests

${data.summary.failedTests.map(test => `
### ${test.id}
**Error**: ${test.error}
`).join('\\n')}
` : ''}

## Performance Recommendations

${data.recommendations.length > 0 ? data.recommendations.map(rec => `
### ${rec.category} - ${rec.priority} Priority
**Issue**: ${rec.issue}  
**Recommendation**: ${rec.recommendation}
`).join('\\n') : 'No specific recommendations. System performed within expected parameters.'}

## Next Steps

1. **Review Detailed Reports**: Check individual test reports in the reports directory
2. **System Monitoring**: Analyze system resource usage during tests
3. **Bottleneck Analysis**: Identify and address any performance bottlenecks
4. **Production Readiness**: Ensure all critical tests pass before deployment

---
*Generated on ${new Date().toISOString()}*
`;
  }

  /**
   * Format duration in milliseconds to human readable string
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  args.forEach((arg, index) => {
    if (arg.startsWith('--')) {
      const key = arg.replace('--', '').replace('-', '');
      const nextArg = args[index + 1];
      
      if (key === 'skip-long-tests') options.skipLongTests = true;
      else if (key === 'parallel') options.parallel = true;
      else if (nextArg && !nextArg.startsWith('--')) {
        if (key === 'base-url') options.baseUrl = nextArg;
        else if (key === 'ws-url') options.wsUrl = nextArg;
        else if (key === 'ai-url') options.aiUrl = nextArg;
      }
    }
  });
  
  console.log('🎯 Performance Test Configuration:');
  console.log(JSON.stringify(options, null, 2));
  
  const runner = new PerformanceTestRunner(options);
  runner.runAll().catch(error => {
    console.error('💥 Performance testing failed:', error);
    process.exit(1);
  });
}

module.exports = PerformanceTestRunner;
