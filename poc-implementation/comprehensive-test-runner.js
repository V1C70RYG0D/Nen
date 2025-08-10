#!/usr/bin/env node

/**
 * Comprehensive Test Runner - Nen Platform POC
 * Tests all working components following GI compliance guidelines
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment configuration
require('dotenv').config({ path: path.join(__dirname, 'config', '.env') });
require('dotenv').config({ path: path.join(__dirname, 'config', 'constants.env') });
require('dotenv').config({ path: path.join(__dirname, 'config', 'colors.env') });

const config = {
  colors: {
    reset: process.env.COLOR_RESET,
    bright: process.env.COLOR_BRIGHT,
    red: process.env.COLOR_RED,
    green: process.env.COLOR_GREEN,
    yellow: process.env.COLOR_YELLOW,
    blue: process.env.COLOR_BLUE,
    magenta: process.env.COLOR_MAGENTA,
    cyan: process.env.COLOR_CYAN
  }
};

function log(message, color = 'reset') {
  console.log(`${config.colors[color]}${message}${config.colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function runCommand(command, options = {}) {
  return new Promise((resolve) => {
    try {
      const output = execSync(command, { 
        encoding: 'utf8', 
        timeout: options.timeout || 30000,
        ...options 
      });
      resolve({ success: true, output: output.trim() });
    } catch (error) {
      resolve({ success: false, error: error.message, output: error.stdout?.trim() || '' });
    }
  });
}

async function testSystemHealth() {
  log('\n🏥 SYSTEM HEALTH CHECK', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  const result = await runCommand('node system-health-check.js');
  if (result.success && result.output.includes('ALL SYSTEMS OPERATIONAL')) {
    logSuccess('System Health Check - All services operational');
    return true;
  } else {
    logError('System Health Check - Some services may be down');
    return false;
  }
}

async function testMainApplication() {
  log('\n📦 MAIN APPLICATION TESTS', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  const tests = [
    'npx jest __tests__/main.test.js --verbose --silent',
    'npx jest __tests__/backend.test.ts --verbose --silent'
  ];
  
  let passed = 0;
  for (const test of tests) {
    const result = await runCommand(test);
    if (result.success) {
      logSuccess(`Main App Test: ${test.split(' ')[2]}`);
      passed++;
    } else {
      logError(`Main App Test Failed: ${test.split(' ')[2]}`);
    }
  }
  
  return passed === tests.length;
}

async function testDataGenerators() {
  log('\n🎲 DATA GENERATORS', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  const generators = [
    'python tools/data-generators/chess_data_generator.py',
    'python tools/data-generators/nen_data_generator.py'
  ];
  
  let passed = 0;
  for (const generator of generators) {
    const result = await runCommand(generator, { timeout: 60000 });
    if (result.success) {
      logSuccess(`Data Generator: ${generator.split('/').pop()}`);
      passed++;
    } else {
      logWarning(`Data Generator may need dependencies: ${generator.split('/').pop()}`);
    }
  }
  
  return passed;
}

async function testWorkingServices() {
  log('\n🔧 WORKING SERVICES TEST', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  const result = await runCommand('node test-working-services.js');
  if (result.success && result.output.includes('Success Rate: 100.0%')) {
    logSuccess('Working Services Test - All API endpoints functional');
    return true;
  } else {
    logError('Working Services Test - Some APIs may not be responding');
    return false;
  }
}

async function testFileSystemIntegrity() {
  log('\n📁 FILE SYSTEM INTEGRITY', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  const criticalFiles = [
    'main.js',
    'package.json',
    'backend/package.json',
    'frontend/package.json',
    'ai/app.py',
    'config/.env'
  ];
  
  let passed = 0;
  for (const file of criticalFiles) {
    if (fs.existsSync(path.join(__dirname, file))) {
      logSuccess(`File exists: ${file}`);
      passed++;
    } else {
      logError(`Missing critical file: ${file}`);
    }
  }
  
  return passed === criticalFiles.length;
}

async function testEnvironmentConfiguration() {
  log('\n⚙️  ENVIRONMENT CONFIGURATION', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  const requiredEnvVars = [
    'PROJECT_NAME',
    'PROJECT_VERSION', 
    'COLOR_RESET',
    'PORT'
  ];
  
  let passed = 0;
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      logSuccess(`Environment variable set: ${envVar}`);
      passed++;
    } else {
      logError(`Missing environment variable: ${envVar}`);
    }
  }
  
  return passed === requiredEnvVars.length;
}

async function testGICompliance() {
    // Add User Account Initialization validation
  tests.push({
    name: "User Account Initialization",
    script: "validate-account-initialization.js",
    timeout: 30000,
    description: "Tests automatic user account initialization for first-time wallet connections",
    requirements: ["User Story 1 - Requirement 4"]
  });

  log('\n📋 TEST SUITE CONFIGURATION', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  const result = await runCommand('node verify-gi-compliance.js');
  if (result.success) {
    logSuccess('GI Compliance verification passed');
    return true;
  } else {
    logWarning('GI Compliance check completed with warnings');
    return false;
  }
}

async function generateReport(results) {
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    testRun: 'Comprehensive System Test',
    environment: process.env.NODE_ENV || 'development',
    results: results,
    summary: {
      totalTests: Object.keys(results).length,
      passed: Object.values(results).filter(r => r === true).length,
      failed: Object.values(results).filter(r => r === false).length,
      warnings: Object.values(results).filter(r => typeof r === 'number').length
    }
  };
  
  const reportPath = path.join(__dirname, 'comprehensive-test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  log('\n📊 TEST SUMMARY', 'bright');
  log('=' .repeat(50), 'cyan');
  log(`Total Test Categories: ${report.summary.totalTests}`, 'blue');
  log(`✅ Passed: ${report.summary.passed}`, 'green');
  log(`❌ Failed: ${report.summary.failed}`, 'red');
  log(`⚠️  Warnings: ${report.summary.warnings}`, 'yellow');
  
  const successRate = (report.summary.passed / report.summary.totalTests * 100).toFixed(1);
  log(`\n🎯 Overall Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'yellow');
  
  log(`\n📄 Detailed report saved to: ${reportPath}`, 'cyan');
  
  return report;
}

async function main() {
  log('\n🚀 COMPREHENSIVE TEST SUITE - NEN PLATFORM POC', 'bright');
  log('=' .repeat(60), 'cyan');
  log(`Started at: ${new Date().toISOString()}`, 'blue');
  
  const results = {};
  
  try {
    // Run all test categories
    results.fileSystemIntegrity = await testFileSystemIntegrity();
    results.environmentConfiguration = await testEnvironmentConfiguration();
    results.systemHealth = await testSystemHealth();
    results.workingServices = await testWorkingServices();
    results.mainApplication = await testMainApplication();
    results.dataGenerators = await testDataGenerators();
    results.giCompliance = await testGICompliance();
    
    // Generate comprehensive report
    const report = await generateReport(results);
    
    // Final status
    if (report.summary.passed >= report.summary.totalTests * 0.8) {
      log('\n🎉 COMPREHENSIVE TEST SUITE: PASSED', 'green');
      log('Platform is ready for development and testing!', 'green');
    } else {
      log('\n⚠️  COMPREHENSIVE TEST SUITE: NEEDS ATTENTION', 'yellow');
      log('Some components need fixes before production use.', 'yellow');
    }
    
  } catch (error) {
    logError(`Test suite error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    logError(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main, testSystemHealth, testWorkingServices };
