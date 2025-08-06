#!/usr/bin/env node

const SystemMonitor = require('../monitoring/system-monitor');
const DatabasePerformanceTester = require('./database-performance');

/**
 * Performance Testing Demo
 * 
 * This script demonstrates the key features of the performance testing suite
 * with shorter test durations for quick validation.
 */

class PerformanceTestingDemo {
  constructor() {
    this.startTime = Date.now();
  }

  async run() {
    console.log('🚀 Performance Testing Suite Demo');
    console.log('=' .repeat(50));
    console.log('This demo showcases the performance testing capabilities');
    console.log('with shortened test durations for quick validation.\n');

    try {
      // 1. System Monitoring Demo
      await this.demoSystemMonitoring();

      // 2. Database Performance Demo
      await this.demoDatabasePerformance();

      // 3. Load Testing Simulation
      await this.demoLoadTesting();

      // 4. Generate Summary
      await this.generateDemoSummary();

      console.log('\n✅ Performance testing demo completed successfully!');
      console.log('📊 Check the reports directory for detailed results');

    } catch (error) {
      console.error('❌ Demo failed:', error.message);
      throw error;
    }
  }

  /**
   * Demonstrate system monitoring capabilities
   */
  async demoSystemMonitoring() {
    console.log('🔍 Demo: System Monitoring');
    console.log('-'.repeat(30));

    const monitor = new SystemMonitor({
      interval: 500, // Fast monitoring for demo
      outputDir: './performance-testing/reports'
    });

    console.log('Starting system resource monitoring...');
    
    // Start monitoring
    monitor.start();

    // Simulate some system load
    console.log('Simulating system activity...');
    await this.simulateSystemLoad();

    // Stop monitoring after 10 seconds
    setTimeout(() => {
      monitor.stop();
      console.log('✅ System monitoring demo completed\n');
    }, 10000);

    // Wait for monitoring to complete
    await new Promise(resolve => setTimeout(resolve, 11000));
  }

  /**
   * Simulate system activity for monitoring
   */
  async simulateSystemLoad() {
    // CPU-intensive task
    const cpuWork = () => {
      const start = Date.now();
      while (Date.now() - start < 1000) {
        Math.random() * Math.random();
      }
    };

    // Memory allocation
    const memoryWork = () => {
      const arrays = [];
      for (let i = 0; i < 1000; i++) {
        arrays.push(new Array(10000).fill(Math.random()));
      }
      return arrays;
    };

    // Simulate periodic activity
    for (let i = 0; i < 5; i++) {
      console.log(`  🔄 Activity burst ${i + 1}/5`);
      
      // Run CPU and memory tasks
      setTimeout(cpuWork, i * 2000);
      setTimeout(memoryWork, i * 2000 + 500);
    }
  }

  /**
   * Demonstrate database performance testing
   */
  async demoDatabasePerformance() {
    console.log('🗄️  Demo: Database Performance Testing');
    console.log('-'.repeat(40));

    const dbTester = new DatabasePerformanceTester({
      outputDir: './performance-testing/reports'
    });

    console.log('Running database performance tests...');
    await dbTester.runAll();
    
    console.log('✅ Database performance demo completed\n');
  }

  /**
   * Simulate load testing scenarios
   */
  async demoLoadTesting() {
    console.log('⚡ Demo: Load Testing Simulation');
    console.log('-'.repeat(35));

    const scenarios = [
      { name: 'Single User', users: 1, duration: 30000 },
      { name: 'Light Load', users: 5, duration: 45000 },
      { name: 'Moderate Load', users: 10, duration: 60000 }
    ];

    for (const scenario of scenarios) {
      console.log(`\n📊 Simulating: ${scenario.name} (${scenario.users} users)`);
      
      await this.simulateLoadTest(scenario);
      
      console.log(`  ✅ ${scenario.name} simulation completed`);
      
      // Cool-down between scenarios
      console.log('  ⏳ Cooling down...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n✅ Load testing simulation completed\n');
  }

  /**
   * Simulate a load testing scenario
   */
  async simulateLoadTest(scenario) {
    const { users, duration } = scenario;
    const startTime = Date.now();
    const requests = [];
    
    // Simulate user requests
    for (let userId = 0; userId < users; userId++) {
      const userRequests = this.simulateUserActivity(userId, duration, startTime);
      requests.push(userRequests);
    }

    // Wait for all users to complete
    const results = await Promise.allSettled(requests);
    
    // Calculate metrics
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - successful;
    const totalDuration = Date.now() - startTime;
    
    console.log(`    📈 Results: ${successful} successful, ${failed} failed`);
    console.log(`    ⏱️  Duration: ${totalDuration}ms`);
    console.log(`    🚀 Simulated RPS: ${(users * 10 / (totalDuration / 1000)).toFixed(2)}`);
  }

  /**
   * Simulate individual user activity
   */
  async simulateUserActivity(userId, duration, startTime) {
    const activities = [];
    let requestCount = 0;

    while (Date.now() - startTime < duration) {
      const activity = await this.simulateRequest(userId, requestCount);
      activities.push(activity);
      requestCount++;
      
      // Random delay between requests (200-2000ms)
      const delay = 200 + Math.random() * 1800;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    return {
      userId,
      totalRequests: activities.length,
      activities
    };
  }

  /**
   * Simulate a single HTTP request
   */
  async simulateRequest(userId, requestId) {
    const requestStart = Date.now();
    
    // Simulate different types of requests
    const requestTypes = [
      { name: 'GET /api/health', responseTime: 50 + Math.random() * 100 },
      { name: 'POST /api/auth/login', responseTime: 100 + Math.random() * 200 },
      { name: 'GET /api/games', responseTime: 150 + Math.random() * 300 },
      { name: 'POST /api/games', responseTime: 200 + Math.random() * 400 },
      { name: 'WebSocket Connect', responseTime: 80 + Math.random() * 150 }
    ];

    const request = requestTypes[Math.floor(Math.random() * requestTypes.length)];
    
    // Simulate request processing time
    await new Promise(resolve => setTimeout(resolve, request.responseTime));
    
    // Simulate occasional failures (5% failure rate)
    const success = Math.random() > 0.05;
    
    return {
      userId,
      requestId,
      type: request.name,
      responseTime: Date.now() - requestStart,
      success,
      statusCode: success ? 200 : (Math.random() > 0.5 ? 500 : 429)
    };
  }

  /**
   * Generate demo summary report
   */
  async generateDemoSummary() {
    console.log('📊 Demo: Report Generation');
    console.log('-'.repeat(28));

    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;

    const summary = {
      demoInfo: {
        timestamp: new Date().toISOString(),
        duration: totalDuration,
        durationFormatted: this.formatDuration(totalDuration)
      },
      featuresDemo: {
        systemMonitoring: '✅ Completed',
        databasePerformance: '✅ Completed',
        loadTestingSimulation: '✅ Completed',
        reportGeneration: '✅ Completed'
      },
      nextSteps: [
        'Run full performance test suite with: node performance-testing/scripts/run-performance-tests.js',
        'Check individual k6 and Artillery tests',
        'Review system monitoring with: node performance-testing/monitoring/system-monitor.js',
        'Analyze database performance with: node performance-testing/scripts/database-performance.js'
      ],
      performanceTestingCapabilities: {
        loadTesting: 'k6 and Artillery for comprehensive load testing',
        monitoring: 'Real-time system resource monitoring',
        database: 'Query performance and connection pool testing',
        websockets: 'WebSocket scalability and message performance',
        aiService: 'AI move generation performance testing',
        reporting: 'Automated report generation with recommendations'
      }
    };

    // Save demo summary
    const fs = require('fs');
    const path = require('path');
    
    const summaryFile = path.join('./performance-testing/reports', `demo-summary-${Date.now()}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

    // Generate markdown summary
    const markdownSummary = this.generateMarkdownSummary(summary);
    const markdownFile = path.join('./performance-testing/reports', `demo-summary-${Date.now()}.md`);
    fs.writeFileSync(markdownFile, markdownSummary);

    console.log('✅ Demo summary generated:');
    console.log(`   JSON: ${summaryFile}`);
    console.log(`   Markdown: ${markdownFile}`);
  }

  /**
   * Generate markdown summary report
   */
  generateMarkdownSummary(data) {
    return `# Performance Testing Suite Demo Summary

## Demo Overview

**Demo Date**: ${data.demoInfo.timestamp}  
**Total Duration**: ${data.demoInfo.durationFormatted}

## Features Demonstrated

${Object.entries(data.featuresDemo).map(([feature, status]) => `- **${feature}**: ${status}`).join('\n')}

## Performance Testing Capabilities

${Object.entries(data.performanceTestingCapabilities).map(([capability, description]) => `### ${capability}\n${description}\n`).join('\n')}

## Next Steps

${data.nextSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

## Quick Commands

### Run Full Test Suite
\`\`\`bash
node performance-testing/scripts/run-performance-tests.js
\`\`\`

### Run Individual Tests
\`\`\`bash
# Single user test
k6 run performance-testing/k6/single-user-gameplay.js

# WebSocket scalability
artillery run performance-testing/artillery/websocket-scalability.yml

# System monitoring
node performance-testing/monitoring/system-monitor.js
\`\`\`

### Configuration Options
\`\`\`bash
# Skip long tests
node performance-testing/scripts/run-performance-tests.js --skip-long-tests

# Custom URLs
node performance-testing/scripts/run-performance-tests.js --base-url http://localhost:3001
\`\`\`

---
*Demo completed on ${new Date().toISOString()}*
`;
  }

  /**
   * Format duration in milliseconds
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

// Run demo if called directly
if (require.main === module) {
  console.log('🎯 Starting Performance Testing Suite Demo...\n');
  
  const demo = new PerformanceTestingDemo();
  demo.run().catch(error => {
    console.error('💥 Demo failed:', error);
    process.exit(1);
  });
}

module.exports = PerformanceTestingDemo;
