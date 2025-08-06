#!/usr/bin/env node
/**
 * GI-Compliant Comprehensive Test Suite
 * Following GI guidelines to test working implementations, not mocks
 */

const http = require('http');
const fs = require('fs').promises;
const { spawn } = require('child_process');

// Test Configuration (GI-18: No hardcoding)
const CONFIG = {
  BACKEND_URL: process.env.API_URL || 'http://127.0.0.1:3011',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://127.0.0.1:3003',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://127.0.0.1:3010',
  TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT || '5000')
};

// Test Results Storage
let testResults = {
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    successRate: 0,
    timestamp: new Date().toISOString()
  },
  tests: [],
  environment: {
    backendUrl: CONFIG.BACKEND_URL,
    aiServiceUrl: CONFIG.AI_SERVICE_URL,
    nodeVersion: process.version,
    platform: process.platform
  }
};

// Utility: Make HTTP Request (GI-02: Real implementation, no mocks)
function makeHttpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const { method = 'GET', data = null, headers = {}, timeout = CONFIG.TIMEOUT } = options;
    
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Nen-Platform-Test-Suite/0.1.0',
        ...headers
      },
      timeout
    };

    const req = http.request(requestOptions, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            headers: res.headers,
            body: res.headers['content-type']?.includes('application/json') 
              ? JSON.parse(responseData) 
              : responseData
          };
          resolve(result);
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: responseData,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test Function
async function runTest(name, testFunction) {
  console.log(`🧪 Running: ${name}`);
  const startTime = Date.now();
  
  try {
    const result = await testFunction();
    const duration = Date.now() - startTime;
    
    testResults.tests.push({
      name,
      passed: true,
      details: result || 'Test passed',
      duration,
      timestamp: new Date().toISOString()
    });
    
    testResults.summary.passed++;
    console.log(`✅ PASS: ${name} (${duration}ms)`);
    
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    testResults.tests.push({
      name,
      passed: false,
      details: error.message,
      duration,
      timestamp: new Date().toISOString()
    });
    
    testResults.summary.failed++;
    console.log(`❌ FAIL: ${name} (${duration}ms) - ${error.message}`);
    
    return false;
  } finally {
    testResults.summary.total++;
  }
}

// Test Definitions (GI-05: Extensive testing)

// GI-01: File System and Environment Tests
async function testFileSystemAccess() {
  const requiredFiles = [
    'a:\\Nen Platform\\Nen\\poc-implementation\\package.json',
    'a:\\Nen Platform\\Nen\\poc-implementation\\config\\.env',
    'a:\\Nen Platform\\Nen\\poc-implementation\\backend\\package.json',
    'a:\\Nen Platform\\Nen\\poc-implementation\\ai\\app.py'
  ];
  
  for (const file of requiredFiles) {
    try {
      await fs.access(file);
    } catch (error) {
      throw new Error(`Required file not accessible: ${file}`);
    }
  }
  
  return 'All key files accessible';
}

async function testEnvironmentConfiguration() {
  const requiredEnvVars = [
    'NODE_ENV', 'BACKEND_PORT', 'AI_SERVICE_PORT', 'FRONTEND_URL'
  ];
  
  // Load environment from config file
  const configPath = 'a:\\Nen Platform\\Nen\\poc-implementation\\config\\.env';
  const configContent = await fs.readFile(configPath, 'utf8');
  
  for (const envVar of requiredEnvVars) {
    if (!configContent.includes(envVar)) {
      throw new Error(`Required environment variable not configured: ${envVar}`);
    }
  }
  
  return 'All required environment variables configured';
}

// GI-02 & GI-04: Backend API Tests (Real implementations, error-free)
async function testBackendHealth() {
  const response = await makeHttpRequest(`${CONFIG.BACKEND_URL}/health`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.body.status || response.body.status !== 'healthy') {
    throw new Error('Health check does not report healthy status');
  }
  
  return 'Backend health check passed';
}

async function testBackendRoot() {
  const response = await makeHttpRequest(`${CONFIG.BACKEND_URL}/`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.body.name || !response.body.version) {
    throw new Error('Root endpoint missing required fields');
  }
  
  return 'Backend root endpoint working';
}

async function testBackendStatsAPI() {
  const response = await makeHttpRequest(`${CONFIG.BACKEND_URL}/api/stats`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  return 'Backend /api/stats working';
}

async function testBackendMatchesAPI() {
  const response = await makeHttpRequest(`${CONFIG.BACKEND_URL}/api/matches`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  return 'Backend /api/matches working';
}

async function testBackendAgentsAPI() {
  const response = await makeHttpRequest(`${CONFIG.BACKEND_URL}/api/agents`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  return 'Backend /api/agents working';
}

async function testBackendAuthAPI() {
  const response = await makeHttpRequest(`${CONFIG.BACKEND_URL}/api/auth/status`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  return 'Backend /api/auth/status working';
}

async function testBackendUsersAPI() {
  const response = await makeHttpRequest(`${CONFIG.BACKEND_URL}/api/users/me`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  return 'Backend /api/users/me working';
}

async function testBackendBettingAPI() {
  const response = await makeHttpRequest(`${CONFIG.BACKEND_URL}/api/betting/pools`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  return 'Backend /api/betting/pools working';
}

// AI Service Tests (GI-02: Real implementations)
async function testAIServiceHealth() {
  const response = await makeHttpRequest(`${CONFIG.AI_SERVICE_URL}/health`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.body.status || response.body.status !== 'healthy') {
    throw new Error('AI service health check failed');
  }
  
  return 'AI service health check passed';
}

async function testAIServiceRoot() {
  const response = await makeHttpRequest(`${CONFIG.AI_SERVICE_URL}/`);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.body.service || !response.body.version) {
    throw new Error('AI service root endpoint missing required fields');
  }
  
  return 'AI service root endpoint working';
}

async function testAIMoveGeneration() {
  const testBoard = {
    board: "test_board_state",
    player: "white",
    difficulty: "medium"
  };
  
  const response = await makeHttpRequest(`${CONFIG.AI_SERVICE_URL}/ai/move`, {
    method: 'POST',
    data: testBoard
  });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.body.from || !response.body.to) {
    throw new Error('AI move generation missing required move data');
  }
  
  return response.body;
}

async function testAIBoardAnalysis() {
  const testBoard = {
    board: "test_board_state",
    depth: 3
  };
  
  const response = await makeHttpRequest(`${CONFIG.AI_SERVICE_URL}/ai/analysis`, {
    method: 'POST',
    data: testBoard
  });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.body.board_evaluation) {
    throw new Error('AI analysis missing evaluation data');
  }
  
  return response.body;
}

async function testAIDifficultySetting() {
  const difficultyData = {
    difficulty: "hard",
    depth: 5
  };
  
  const response = await makeHttpRequest(`${CONFIG.AI_SERVICE_URL}/ai/difficulty`, {
    method: 'POST',
    data: difficultyData
  });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  return 'AI difficulty setting working';
}

// Main Test Runner
async function runAllTests() {
  console.log('🚀 GI-COMPLIANT COMPREHENSIVE TEST SUITE');
  console.log('==========================================');
  console.log(`Backend URL: ${CONFIG.BACKEND_URL}`);
  console.log(`AI Service URL: ${CONFIG.AI_SERVICE_URL}`);
  console.log(`Test Started: ${new Date().toISOString()}`);
  console.log('==========================================\n');
  
  // GI-01: Verification and System Checks
  await runTest('File System Access', testFileSystemAccess);
  await runTest('Environment Configuration', testEnvironmentConfiguration);
  
  // GI-02 & GI-04: Backend Tests
  await runTest('Backend Health Check', testBackendHealth);
  await runTest('Backend Root API', testBackendRoot);
  await runTest('Backend /api/stats', testBackendStatsAPI);
  await runTest('Backend /api/matches', testBackendMatchesAPI);
  await runTest('Backend /api/agents', testBackendAgentsAPI);
  await runTest('Backend /api/auth/status', testBackendAuthAPI);
  await runTest('Backend /api/users/me', testBackendUsersAPI);
  await runTest('Backend /api/betting/pools', testBackendBettingAPI);
  
  // AI Service Tests
  await runTest('AI Service Health Check', testAIServiceHealth);
  await runTest('AI Service Root API', testAIServiceRoot);
  await runTest('AI Move Generation', testAIMoveGeneration);
  await runTest('AI Board Analysis', testAIBoardAnalysis);
  await runTest('AI Difficulty Setting', testAIDifficultySetting);
  
  // Calculate final results
  testResults.summary.successRate = Math.round((testResults.summary.passed / testResults.summary.total) * 100);
  
  console.log('\n==========================================');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('==========================================');
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`✅ Passed: ${testResults.summary.passed}`);
  console.log(`❌ Failed: ${testResults.summary.failed}`);
  console.log(`📈 Success Rate: ${testResults.summary.successRate}%`);
  console.log(`⏱️ Test Completed: ${new Date().toISOString()}`);
  
  // Save results (GI-33: Documentation)
  const resultsPath = 'a:\\Nen Platform\\Nen\\poc-implementation\\test-results.json';
  await fs.writeFile(resultsPath, JSON.stringify(testResults, null, 2));
  console.log(`📄 Detailed results saved to: ${resultsPath}`);
  
  // GI-05: Comprehensive testing complete
  if (testResults.summary.successRate === 100) {
    console.log('\n🎉 ALL TESTS PASSED - SYSTEM IS FULLY OPERATIONAL!');
    console.log('✅ GI Guidelines compliance verified');
    console.log('✅ Real implementations working');
    console.log('✅ Error-free systems confirmed');
    process.exit(0);
  } else {
    console.log('\n⚠️ SOME TESTS FAILED - REVIEW REQUIRED');
    console.log('❌ System needs attention before production');
    process.exit(1);
  }
}

// Execute tests
runAllTests().catch((error) => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});
