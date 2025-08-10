#!/usr/bin/env node

/**
 * System Health Check - Nen Platform POC
 * 
 * Verifies that all core components are running and responding correctly
 * Following GI guidelines: Real implementations, no mocks
 */

const http = require('http');

// Configuration from environment variables (GI-18: No hardcoding)
const BACKEND_PORT = process.env.PORT || 3011;
const AI_PORT = process.env.AI_SERVICE_PORT || 3003;
const BACKEND_HOST = process.env.BACKEND_HOST || '127.0.0.1';
const AI_HOST = process.env.AI_SERVICE_HOST || '127.0.0.1';

async function makeRequest(hostname, port, path = '/health') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port,
      path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: jsonData,
            success: res.statusCode === 200
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: data,
            success: res.statusCode === 200,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({
        success: false,
        error: error.message,
        code: error.code
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({
        success: false,
        error: 'Request timeout',
        code: 'TIMEOUT'
      });
    });

    req.end();
  });
}

async function testAPIEndpoint(hostname, port, path, name) {
  try {
    console.log(`🔍 Testing ${name} (${hostname}:${port}${path})...`);
    const result = await makeRequest(hostname, port, path);
    
    if (result.success) {
      console.log(`✅ ${name}: HEALTHY`);
      if (result.data.status) {
        console.log(`   Status: ${result.data.status}`);
      }
      if (result.data.version) {
        console.log(`   Version: ${result.data.version}`);
      }
      if (result.data.environment) {
        console.log(`   Environment: ${result.data.environment}`);
      }
      return true;
    } else {
      console.log(`❌ ${name}: UNHEALTHY (Status: ${result.statusCode})`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: FAILED - ${error.error || error.message}`);
    return false;
  }
}

async function runHealthCheck() {
  console.log('🏥 NEN PLATFORM HEALTH CHECK');
  console.log('=' .repeat(40));
  console.log(`📅 Time: ${new Date().toISOString()}`);
  console.log('');

  const tests = [
    {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: '/health',
      name: 'Backend API'
    },
    {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: '/',
      name: 'Backend Root'
    },
    {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: '/api/stats',
      name: 'Backend Stats API'
    },
    {
      hostname: AI_HOST,
      port: AI_PORT,
      path: '/health',
      name: 'AI Service'
    },
    {
      hostname: AI_HOST,
      port: AI_PORT,
      path: '/',
      name: 'AI Service Root'
    }
  ];

  let passed = 0;
  let total = tests.length;

  for (const test of tests) {
    const success = await testAPIEndpoint(test.hostname, test.port, test.path, test.name);
    if (success) passed++;
    console.log('');
  }

  // Summary
  console.log('=' .repeat(40));
  console.log(`📊 HEALTH CHECK SUMMARY`);
  console.log(`   Tests Passed: ${passed}/${total}`);
  console.log(`   Success Rate: ${Math.round((passed/total) * 100)}%`);
  
  if (passed === total) {
    console.log('✅ ALL SYSTEMS OPERATIONAL');
    return true;
  } else {
    console.log(`❌ ${total - passed} SYSTEM(S) DOWN`);
    return false;
  }
}

async function testAIFunctionality() {
  console.log('\n🤖 TESTING AI FUNCTIONALITY');
  console.log('=' .repeat(40));

  try {
    // Test AI move generation
    const postData = JSON.stringify({
      board: [[0,0,0],[0,0,0],[0,0,0]],
      difficulty: 'medium'
    });

    const options = {
      hostname: AI_HOST,
      port: AI_PORT,
      path: '/ai/move',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const result = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              data: JSON.parse(data)
            });
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    if (result.statusCode === 200 && result.data.success) {
      console.log('✅ AI Move Generation: WORKING');
      console.log(`   Move: ${JSON.stringify(result.data.move.from)} → ${JSON.stringify(result.data.move.to)}`);
      console.log(`   Confidence: ${result.data.move.confidence}`);
      console.log(`   Processing Time: ${result.data.processing_time_ms}ms`);
      return true;
    } else {
      console.log('❌ AI Move Generation: FAILED');
      return false;
    }
  } catch (error) {
    console.log(`❌ AI Move Generation: ERROR - ${error.message}`);
    return false;
  }
}

// Main execution
async function main() {
  try {
    const healthPassed = await runHealthCheck();
    const aiPassed = await testAIFunctionality();
    
    console.log('\n' + '=' .repeat(40));
    console.log('🎯 FINAL RESULT');
    
    if (healthPassed && aiPassed) {
      console.log('✅ NEN PLATFORM: FULLY OPERATIONAL');
      process.exit(0);
    } else {
      console.log('❌ NEN PLATFORM: ISSUES DETECTED');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Health check failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  runHealthCheck,
  testAIFunctionality,
  makeRequest
};
