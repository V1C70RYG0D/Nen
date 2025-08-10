#!/usr/bin/env node
/**
 * Quick verification test for the Nen Platform
 * Testing both backend and AI service with correct ports
 */

const http = require('http');

async function testEndpoint(url, expectedStatus = 200) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode,
          success: res.statusCode === expectedStatus,
          data: data.substring(0, 200) // First 200 chars
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        url,
        status: 'ERROR',
        success: false,
        error: error.message
      });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        url,
        status: 'TIMEOUT',
        success: false,
        error: 'Request timeout'
      });
    });
  });
}

async function runTests() {
  console.log('🧪 Quick Nen Platform Test');
  console.log('===========================');
  
  const tests = [
    'http://127.0.0.1:3011/health',
    'http://127.0.0.1:3011/',
    'http://127.0.0.1:3011/api/stats',
    'http://127.0.0.1:3011/api/matches',
    'http://127.0.0.1:3011/api/agents',
    'http://127.0.0.1:3011/api/auth/status',
    'http://127.0.0.1:3011/api/users/me',
    'http://127.0.0.1:3011/api/betting/pools',
    'http://127.0.0.1:3003/health',
    'http://127.0.0.1:3003/',
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const testUrl of tests) {
    const result = await testEndpoint(testUrl);
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${testUrl} - Status: ${result.status}`);
    if (result.success) passed++;
  }
  
  console.log('\n📊 Results:');
  console.log(`Passed: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
  
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED - SYSTEM IS WORKING!');
  } else {
    console.log('⚠️ Some tests failed - check individual results above');
  }
}

runTests().catch(console.error);
