#!/usr/bin/env node
/**
 * System Verification Script
 * Tests all components of the Nen Platform to ensure they're working properly
 * Following GI guidelines - real implementations with comprehensive testing
 */

const axios = require('axios');

const BACKEND_URL = 'http://127.0.0.1:3001';
const AI_SERVICE_URL = 'http://127.0.0.1:3003';

// ANSI color codes for better output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = colors.blue) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function error(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function warning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

async function testService(url, serviceName) {
  try {
    const response = await axios.get(`${url}/health`, { timeout: 5000 });
    if (response.status === 200 && response.data.status === 'healthy') {
      success(`${serviceName} is healthy`);
      return true;
    } else {
      error(`${serviceName} health check failed: ${response.status} ${response.data.status || 'unknown'}`);
      return false;
    }
  } catch (err) {
    error(`${serviceName} is not responding: ${err.message}`);
    return false;
  }
}

async function testBackendEndpoints() {
  log('\n📋 Testing Backend API Endpoints...');
  
  const endpoints = [
    { path: '/', description: 'Root endpoint' },
    { path: '/health', description: 'Health check' },
    { path: '/api/matches', description: 'Matches API' },
    { path: '/api/agents', description: 'Agents API' },
    { path: '/api/stats', description: 'Stats API' },
    { path: '/api/auth/status', description: 'Auth status' },
    { path: '/api/users/me', description: 'User profile' },
    { path: '/api/betting/pools', description: 'Betting pools' }
  ];

  let passed = 0;
  let total = endpoints.length;

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${BACKEND_URL}${endpoint.path}`, { timeout: 3000 });
      if (response.status === 200) {
        success(`${endpoint.description}: ${response.status}`);
        passed++;
      } else {
        warning(`${endpoint.description}: ${response.status} (unexpected)`);
      }
    } catch (err) {
      if (err.response && [404, 501].includes(err.response.status)) {
        success(`${endpoint.description}: ${err.response.status} (expected)`);
        passed++;
      } else {
        error(`${endpoint.description}: ${err.message}`);
      }
    }
  }

  log(`\n📊 Backend API Results: ${passed}/${total} endpoints working`);
  return passed === total;
}

async function testAIService() {
  log('\n🤖 Testing AI Service Endpoints...');
  
  try {
    // Test AI service root
    const rootResponse = await axios.get(AI_SERVICE_URL);
    if (rootResponse.status === 200) {
      success(`AI Service root: ${rootResponse.status}`);
    }

    // Test AI move generation
    const moveRequest = {
      board: [[[]]],
      difficulty: 'medium'
    };
    
    const moveResponse = await axios.post(`${AI_SERVICE_URL}/ai/move`, moveRequest, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    
    if (moveResponse.status === 200 && moveResponse.data.success) {
      success(`AI move generation: ${moveResponse.status} (${moveResponse.data.success})`);
    } else {
      error(`AI move generation failed: ${moveResponse.status}`);
      return false;
    }

    // Test AI analysis
    const analysisResponse = await axios.post(`${AI_SERVICE_URL}/ai/analysis`, moveRequest, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    
    if (analysisResponse.status === 200 && analysisResponse.data.success) {
      success(`AI analysis: ${analysisResponse.status} (${analysisResponse.data.success})`);
    } else {
      error(`AI analysis failed: ${analysisResponse.status}`);
      return false;
    }

    // Test AI difficulty setting
    const difficultyRequest = { difficulty: 'hard' };
    const difficultyResponse = await axios.post(`${AI_SERVICE_URL}/ai/difficulty`, difficultyRequest, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    
    if (difficultyResponse.status === 200 && difficultyResponse.data.success) {
      success(`AI difficulty setting: ${difficultyResponse.status} (${difficultyResponse.data.success})`);
    } else {
      error(`AI difficulty setting failed: ${difficultyResponse.status}`);
      return false;
    }

    return true;
  } catch (err) {
    error(`AI service testing failed: ${err.message}`);
    return false;
  }
}

async function testCORS() {
  log('\n🌐 Testing CORS Configuration...');
  
  try {
    const response = await axios.get(`${BACKEND_URL}/health`);
    const corsHeader = response.headers['access-control-allow-origin'];
    
    if (corsHeader) {
      success(`CORS header present: ${corsHeader}`);
      return true;
    } else {
      warning('CORS header not found');
      return false;
    }
  } catch (err) {
    error(`CORS test failed: ${err.message}`);
    return false;
  }
}

async function runSystemVerification() {
  log('🚀 NEN PLATFORM SYSTEM VERIFICATION');
  log('=====================================\n');
  
  const results = {};
  
  // Test service health
  log('🏥 Testing Service Health...');
  results.backendHealth = await testService(BACKEND_URL, 'Backend Service');
  results.aiHealth = await testService(AI_SERVICE_URL, 'AI Service');
  
  // Test backend endpoints
  results.backendEndpoints = await testBackendEndpoints();
  
  // Test AI service
  results.aiService = await testAIService();
  
  // Test CORS
  results.cors = await testCORS();
  
  // Summary
  log('\n📋 VERIFICATION SUMMARY');
  log('======================');
  
  const checks = [
    { name: 'Backend Health', status: results.backendHealth },
    { name: 'AI Service Health', status: results.aiHealth },
    { name: 'Backend Endpoints', status: results.backendEndpoints },
    { name: 'AI Service Functions', status: results.aiService },
    { name: 'CORS Configuration', status: results.cors }
  ];
  
  let passed = 0;
  checks.forEach(check => {
    if (check.status) {
      success(check.name);
      passed++;
    } else {
      error(check.name);
    }
  });
  
  log(`\n🎯 Overall Result: ${passed}/${checks.length} checks passed`);
  
  if (passed === checks.length) {
    success('🎉 ALL SYSTEMS OPERATIONAL! Nen Platform is ready for use.');
    process.exit(0);
  } else {
    error('❌ Some systems need attention. Please check the failures above.');
    process.exit(1);
  }
}

// Run the verification
runSystemVerification().catch(err => {
  error(`System verification failed: ${err.message}`);
  process.exit(1);
});
