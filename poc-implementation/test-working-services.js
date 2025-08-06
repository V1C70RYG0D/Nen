#!/usr/bin/env node
/**
 * Working Services Test Suite
 * Tests the currently working components of the Nen Platform POC
 * Following GI guidelines - testing actual working implementations
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs').promises;

// Test configuration from environment
const BACKEND_URL = process.env.API_URL || 'http://127.0.0.1:3011';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:3003';

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const { timeout = 5000, ...httpOptions } = options;
    
    const req = http.request(url, httpOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            body: res.headers['content-type']?.includes('application/json') 
              ? JSON.parse(data) 
              : data
          };
          resolve(response);
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.data) {
      req.write(JSON.stringify(options.data));
    }
    
    req.end();
  });
}

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ PASS: ${name}`);
  } else {
    testResults.failed++;
    console.log(`❌ FAIL: ${name}`);
    if (details) console.log(`   Details: ${details}`);
  }
  
  testResults.tests.push({
    name,
    passed,
    details,
    timestamp: new Date().toISOString()
  });
}

// Test Functions
async function testBackendHealth() {
  try {
    const response = await makeRequest(`${BACKEND_URL}/health`);
    const passed = response.status === 200 && response.body.status === 'healthy';
    logTest('Backend Health Check', passed, 
      passed ? 'Backend responding correctly' : `Status: ${response.status}, Body: ${JSON.stringify(response.body)}`);
    return passed;
  } catch (error) {
    logTest('Backend Health Check', false, error.message);
    return false;
  }
}

async function testBackendBasicAPI() {
  try {
    const response = await makeRequest(`${BACKEND_URL}/`);
    const passed = response.status === 200 && response.body.name === 'Nen Platform API';
    logTest('Backend Basic API', passed,
      passed ? 'API root endpoint working' : `Status: ${response.status}, Body: ${JSON.stringify(response.body)}`);
    return passed;
  } catch (error) {
    logTest('Backend Basic API', false, error.message);
    return false;
  }
}

async function testBackendAPIEndpoints() {
  const endpoints = [
    { path: '/api/matches', expectedStatus: 200 },
    { path: '/api/agents', expectedStatus: 200 },
    { path: '/api/stats', expectedStatus: 200 },
    { path: '/api/auth/status', expectedStatus: 200 },
    { path: '/api/users/me', expectedStatus: 200 },
    { path: '/api/betting/pools', expectedStatus: 200 }
  ];

  let allPassed = true;
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(`${BACKEND_URL}${endpoint.path}`);
      const passed = response.status === endpoint.expectedStatus;
      logTest(`Backend ${endpoint.path}`, passed,
        passed ? 'Endpoint responding correctly' : `Expected: ${endpoint.expectedStatus}, Got: ${response.status}`);
      if (!passed) allPassed = false;
    } catch (error) {
      logTest(`Backend ${endpoint.path}`, false, error.message);
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function testAIServiceHealth() {
  try {
    const response = await makeRequest(`${AI_SERVICE_URL}/health`);
    const passed = response.status === 200 && response.body.status === 'healthy';
    logTest('AI Service Health Check', passed,
      passed ? 'AI Service responding correctly' : `Status: ${response.status}, Body: ${JSON.stringify(response.body)}`);
    return passed;
  } catch (error) {
    logTest('AI Service Health Check', false, error.message);
    return false;
  }
}

async function testAIServiceAPI() {
  try {
    const response = await makeRequest(`${AI_SERVICE_URL}/`);
    const passed = response.status === 200 && response.body.service === 'Nen Platform AI Service';
    logTest('AI Service Basic API', passed,
      passed ? 'AI Service root endpoint working' : `Status: ${response.status}, Body: ${JSON.stringify(response.body)}`);
    return passed;
  } catch (error) {
    logTest('AI Service Basic API', false, error.message);
    return false;
  }
}

async function testAIMove() {
  try {
    const moveRequest = {
      board: Array(9).fill(null).map(() => Array(9).fill(null).map(() => Array(3).fill(null))),
      difficulty: 'medium'
    };
    
    const response = await makeRequest(`${AI_SERVICE_URL}/ai/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: moveRequest
    });
    
    const passed = response.status === 200 && response.body.success === true && response.body.move;
    logTest('AI Move Generation', passed,
      passed ? 'AI move generation working' : `Status: ${response.status}, Body: ${JSON.stringify(response.body)}`);
    return passed;
  } catch (error) {
    logTest('AI Move Generation', false, error.message);
    return false;
  }
}

async function testAIAnalysis() {
  try {
    const analysisRequest = {
      board: Array(9).fill(null).map(() => Array(9).fill(null).map(() => Array(3).fill(null)))
    };
    
    const response = await makeRequest(`${AI_SERVICE_URL}/ai/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: analysisRequest
    });
    
    const passed = response.status === 200 && response.body.success === true && response.body.analysis;
    logTest('AI Board Analysis', passed,
      passed ? 'AI analysis working' : `Status: ${response.status}, Body: ${JSON.stringify(response.body)}`);
    return passed;
  } catch (error) {
    logTest('AI Board Analysis', false, error.message);
    return false;
  }
}

async function testAIDifficulty() {
  try {
    const difficultyRequest = { difficulty: 'hard' };
    
    const response = await makeRequest(`${AI_SERVICE_URL}/ai/difficulty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: difficultyRequest
    });
    
    const passed = response.status === 200 && response.body.success === true && response.body.difficulty === 'hard';
    logTest('AI Difficulty Setting', passed,
      passed ? 'AI difficulty setting working' : `Status: ${response.status}, Body: ${JSON.stringify(response.body)}`);
    return passed;
  } catch (error) {
    logTest('AI Difficulty Setting', false, error.message);
    return false;
  }
}

async function testFileSystemAccess() {
  try {
    // Test that we can access key configuration files
    const envExists = await fs.access('a:\\Nen Platform\\Nen\\poc-implementation\\config\\.env')
      .then(() => true)
      .catch(() => false);
    
    const packageExists = await fs.access('a:\\Nen Platform\\Nen\\poc-implementation\\package.json')
      .then(() => true)
      .catch(() => false);
      
    const backendPackageExists = await fs.access('a:\\Nen Platform\\Nen\\poc-implementation\\backend\\package.json')
      .then(() => true)
      .catch(() => false);
    
    const aiRequirementsExists = await fs.access('a:\\Nen Platform\\Nen\\poc-implementation\\ai\\requirements.txt')
      .then(() => true)
      .catch(() => false);
    
    const allFilesExist = envExists && packageExists && backendPackageExists && aiRequirementsExists;
    
    logTest('File System Access', allFilesExist,
      allFilesExist ? 'All key configuration files accessible' : 
      `Missing files: ${[
        !envExists && '.env',
        !packageExists && 'package.json',
        !backendPackageExists && 'backend/package.json',
        !aiRequirementsExists && 'ai/requirements.txt'
      ].filter(Boolean).join(', ')}`);
      
    return allFilesExist;
  } catch (error) {
    logTest('File System Access', false, error.message);
    return false;
  }
}

async function testEnvironmentConfiguration() {
  try {
    const envPath = 'a:\\Nen Platform\\Nen\\poc-implementation\\config\\.env';
    const envContent = await fs.readFile(envPath, 'utf-8');
    
    // Check for key environment variables
    const requiredVars = [
      'NODE_ENV',
      'FRONTEND_URL',
      'API_BASE_URL',
      'AI_SERVICE_URL',
      'BACKEND_PORT',
      'AI_SERVICE_PORT'
    ];
    
    const missingVars = requiredVars.filter(varName => !envContent.includes(varName));
    const passed = missingVars.length === 0;
    
    logTest('Environment Configuration', passed,
      passed ? 'All required environment variables configured' : 
      `Missing variables: ${missingVars.join(', ')}`);
      
    return passed;
  } catch (error) {
    logTest('Environment Configuration', false, error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 NEN PLATFORM POC - WORKING SERVICES TEST SUITE');
  console.log('='.repeat(60));
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`AI Service URL: ${AI_SERVICE_URL}`);
  console.log(`Test Started: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  
  try {
    // Core system tests
    await testFileSystemAccess();
    await testEnvironmentConfiguration();
    
    // Backend service tests
    await testBackendHealth();
    await testBackendBasicAPI();
    await testBackendAPIEndpoints();
    
    // AI service tests
    await testAIServiceHealth();
    await testAIServiceAPI();
    await testAIMove();
    await testAIAnalysis();
    await testAIDifficulty();
    
  } catch (error) {
    console.error('💥 Test suite error:', error);
    logTest('Test Suite Execution', false, error.message);
  }
  
  // Results summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  console.log(`Test Completed: ${new Date().toISOString()}`);
  
  // Save detailed results
  const reportPath = 'a:\\Nen Platform\\Nen\\poc-implementation\\test-results.json';
  await fs.writeFile(reportPath, JSON.stringify({
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      successRate: (testResults.passed / testResults.total) * 100,
      timestamp: new Date().toISOString()
    },
    tests: testResults.tests,
    environment: {
      backendUrl: BACKEND_URL,
      aiServiceUrl: AI_SERVICE_URL,
      nodeVersion: process.version,
      platform: process.platform
    }
  }, null, 2));
  
  console.log(`\n📄 Detailed results saved to: ${reportPath}`);
  
  // Exit with appropriate code
  const exitCode = testResults.failed > 0 ? 1 : 0;
  process.exit(exitCode);
}

// Run tests
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runTests, makeRequest };
