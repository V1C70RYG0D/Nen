#!/usr/bin/env node

/**
 * Integration Test Runner for Nen Platform
 * Runs all integration tests with proper setup, teardown, and reporting
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m'
};

class IntegrationTestRunner {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      duration: 0,
      failures: []
    };

    this.startTime = Date.now();
  }

  log(message, color = COLORS.RESET) {
    console.log(`${color}${message}${COLORS.RESET}`);
  }

  logError(message, error = null, context = null) {
    const timestamp = new Date().toISOString();
    let errorDetails = '';

    if (error) {
      errorDetails = ` | Error: ${error.message}`;
      if (error.stack && process.env.DEBUG_TESTS) {
        errorDetails += ` | Stack: ${error.stack}`;
      }
      if (error.code) {
        errorDetails += ` | Code: ${error.code}`;
      }
      if (error.response?.status) {
        errorDetails += ` | Status: ${error.response.status}`;
      }
    }

    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    const fullMessage = `[${timestamp}] ${message}${errorDetails}${contextStr}`;

    console.error(`${COLORS.RED}${fullMessage}${COLORS.RESET}`);

    // Also save to error log file
    try {
      const errorLogPath = path.join(__dirname, 'error.log');
      fs.appendFileSync(errorLogPath, fullMessage + '\n');
    } catch (logError) {
      console.error('Failed to write to error log:', logError.message);
    }
  }

  logWarning(message, context = null) {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    const fullMessage = `[${timestamp}] WARNING: ${message}${contextStr}`;
    console.warn(`${COLORS.YELLOW}${fullMessage}${COLORS.RESET}`);
  }

  async run() {
    try {
      this.log('🚀 Starting Nen Platform Integration Tests', COLORS.CYAN + COLORS.BRIGHT);
      this.log('=' .repeat(60), COLORS.CYAN);

      // Step 1: Environment check
      await this.checkEnvironment();

      // Step 2: Setup test environment
      await this.setupTestEnvironment();

      // Step 3: Start services
      await this.startServices();

      // Step 4: Run integration tests
      await this.runTests();

      // Step 5: Generate reports
      await this.generateReports();

      // Step 6: Cleanup
      await this.cleanup();

    } catch (error) {
      this.logError(`❌ Integration tests failed`, error);
      process.exit(1);
    }
  }

  async checkEnvironment() {
    this.log('\n📋 Checking environment...', COLORS.YELLOW);

    // Check Node.js version
    const nodeVersion = process.version;
    this.log(`Node.js version: ${nodeVersion}`);

    if (parseInt(nodeVersion.slice(1)) < 18) {
      throw new Error('Node.js version 18 or higher is required');
    }

    // Check if Playwright is installed
    try {
      execSync('npx playwright --version', { stdio: 'pipe' });
      this.log('✅ Playwright is installed');
    } catch (error) {
      this.log('❌ Playwright not found, installing...', COLORS.YELLOW);
      execSync('npx playwright install', { stdio: 'inherit' });
    }

    // Check environment variables
    const requiredEnvVars = [
      'NODE_ENV',
      'API_URL',
      'FRONTEND_URL',
      'WS_URL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      this.log(`⚠️ Missing environment variables: ${missingVars.join(', ')}`, COLORS.YELLOW);
      this.log('Using default values for testing...', COLORS.YELLOW);

      process.env.NODE_ENV = process.env.NODE_ENV || process.env.DEFAULT_NODE_ENV;
      if (!process.env.NODE_ENV) {
      }

      if (!process.env.API_URL && !process.env.DEFAULT_API_URL) {
      }
      process.env.API_URL = process.env.API_URL || process.env.DEFAULT_API_URL;

      if (!process.env.FRONTEND_URL && !process.env.DEFAULT_FRONTEND_URL) {
      }
      process.env.FRONTEND_URL = process.env.FRONTEND_URL || process.env.DEFAULT_FRONTEND_URL;

      if (!process.env.WS_URL && !process.env.DEFAULT_WS_URL) {
      }
      process.env.WS_URL = process.env.WS_URL || process.env.DEFAULT_WS_URL;
    }

    this.log('✅ Environment check completed');
  }

  async setupTestEnvironment() {
    this.log('\n🛠️ Setting up test environment...', COLORS.YELLOW);

    // Create test data directory if it doesn't exist
    const testDataDir = path.join(__dirname, 'test-data');
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    // Create output directories
    const outputDirs = [
      'integration-test-results',
      'test-results',
      'coverage'
    ];

    outputDirs.forEach(dir => {
      const dirPath = path.join(__dirname, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });

    this.log('✅ Test environment setup completed');
  }

  async startServices() {
    this.log('\n🚦 Starting services...', COLORS.YELLOW);

    // Check if services are already running
    const services = [
      { name: 'Frontend', url: process.env.FRONTEND_URL, port: 3000 },
      { name: 'Backend', url: process.env.API_URL, port: 8000 }
    ];

    for (const service of services) {
      try {
        const response = await fetch(`${service.url}/health`);
        if (response.ok) {
          this.log(`✅ ${service.name} service is already running`);
        }
      } catch (error) {
        this.log(`⚠️ ${service.name} service not running, starting...`, COLORS.YELLOW);
        // Services should be started separately in CI/CD or development environment
      }
    }

    // Wait for services to be ready
    await this.waitForServices();
    this.log('✅ Services are ready');
  }

  async waitForServices() {
    const maxAttempts = 30;
    const delay = 2000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const frontendResponse = await fetch(process.env.FRONTEND_URL);
        const backendResponse = await fetch(`${process.env.API_URL}/health`);

        if (frontendResponse.ok && backendResponse.ok) {
          return;
        }
      } catch (error) {
        // Services not ready yet
      }

      if (attempt === maxAttempts) {
        throw new Error('Services failed to start within timeout period');
      }

      this.log(`Waiting for services... (${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  async runTests() {
    this.log('\n🧪 Running integration tests...', COLORS.YELLOW);

    const testCommand = [
      'npx',
      'playwright',
      'test',
      '--config',
      path.join(__dirname, 'playwright.config.ts'),
      '--reporter=html,json,junit'
    ];

    // Add additional flags based on environment
    if (process.env.CI) {
      testCommand.push('--workers=1');
    }

    if (process.env.DEBUG) {
      testCommand.push('--debug');
    }

    if (process.env.HEADED) {
      testCommand.push('--headed');
    }

    try {
      const result = execSync(testCommand.join(' '), {
        stdio: 'inherit',
        cwd: __dirname
      });

      this.log('✅ All integration tests passed!', COLORS.GREEN);

    } catch (error) {
      this.log('❌ Some integration tests failed', COLORS.RED);

      // Parse test results if available
      await this.parseTestResults();

      if (!process.env.CONTINUE_ON_FAILURE) {
        throw error;
      }
    }
  }

  async parseTestResults() {
    try {
      const resultsPath = path.join(__dirname, 'integration-test-results.json');
      if (fs.existsSync(resultsPath)) {
        const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

        this.testResults.total = results.stats?.total || 0;
        this.testResults.passed = results.stats?.passed || 0;
        this.testResults.failed = results.stats?.failed || 0;
        this.testResults.skipped = results.stats?.skipped || 0;
        this.testResults.duration = results.stats?.duration || 0;

        if (results.failures) {
          this.testResults.failures = results.failures;
        }
      }
    } catch (error) {
      this.log('⚠️ Could not parse test results', COLORS.YELLOW);
    }
  }

  async generateReports() {
    this.log('\n📊 Generating test reports...', COLORS.YELLOW);

    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;

    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        ci: !!process.env.CI
      },
      results: this.testResults,
      duration: totalDuration,
      services: {
        frontend: process.env.FRONTEND_URL,
        backend: process.env.API_URL,
        websocket: process.env.WS_URL
      }
    };

    // Write detailed report
    const reportPath = path.join(__dirname, 'integration-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate summary
    this.generateSummary(report);

    this.log('✅ Test reports generated');
  }

  generateSummary(report) {
    this.log('\n📋 Test Summary', COLORS.CYAN + COLORS.BRIGHT);
    this.log('=' .repeat(40), COLORS.CYAN);
    this.log(`Total Tests: ${report.results.total}`);
    this.log(`Passed: ${report.results.passed}`, COLORS.GREEN);
    this.log(`Failed: ${report.results.failed}`, report.results.failed > 0 ? COLORS.RED : COLORS.GREEN);
    this.log(`Skipped: ${report.results.skipped}`, COLORS.YELLOW);
    this.log(`Duration: ${Math.round(report.duration / 1000)}s`);

    if (report.results.failures && report.results.failures.length > 0) {
      this.log('\n❌ Failed Tests:', COLORS.RED);
      report.results.failures.forEach(failure => {
        this.log(`  - ${failure.test || 'Unknown test'}`, COLORS.RED);
      });
    }

    const successRate = report.results.total > 0
      ? Math.round((report.results.passed / report.results.total) * 100)
      : 0;

    this.log(`\nSuccess Rate: ${successRate}%`, successRate >= 90 ? COLORS.GREEN : COLORS.RED);
  }

  async cleanup() {
    this.log('\n🧹 Cleaning up...', COLORS.YELLOW);

    // Cleanup can include:
    // - Stopping any started services
    // - Cleaning temporary files
    // - Resetting test databases

    this.log('✅ Cleanup completed');
  }
}

// Run integration tests if this script is executed directly
if (require.main === module) {
  const runner = new IntegrationTestRunner();
  runner.run().catch(error => {
    console.error('Integration test runner failed:', error);
    process.exit(1);
  });
}

module.exports = IntegrationTestRunner;
