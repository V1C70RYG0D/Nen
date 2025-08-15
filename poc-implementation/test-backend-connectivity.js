#!/usr/bin/env node

const http = require('http');

console.log('🧪 Testing Backend Connectivity...');
console.log('===================================');

// Test backend health endpoint
function testBackend() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3031,
      path: '/health',
      method: 'GET',
      timeout: 5000
    };

    console.log('📡 Testing backend health endpoint...');
    console.log('URL: http://127.0.0.1:3031/health');

    const req = http.request(options, (res) => {
      let data = '';
      
      console.log('✅ Got response - Status:', res.statusCode);
      console.log('📋 Headers:', res.headers);

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log('✅ Health check successful:');
          console.log(JSON.stringify(jsonData, null, 2));
          resolve(jsonData);
        } catch (error) {
          console.log('✅ Response received but not JSON:');
          console.log(data);
          resolve({ status: 'ok', data });
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Backend connection failed:', error.message);
      console.error('   Error code:', error.code);
      reject(error);
    });

    req.on('timeout', () => {
      console.error('❌ Backend connection timeout');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

// Test matches API endpoint
function testMatchesAPI() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3031,
      path: '/api/matches',
      method: 'GET',
      timeout: 5000
    };

    console.log('\n📡 Testing matches API endpoint...');
    console.log('URL: http://127.0.0.1:3031/api/matches');

    const req = http.request(options, (res) => {
      let data = '';

      console.log('✅ Got response - Status:', res.statusCode);

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log('✅ Matches API successful:');
          console.log(`Found ${jsonData.data?.matches?.length || 0} matches`);
          resolve(jsonData);
        } catch (error) {
          console.log('✅ Response received but not JSON:');
          console.log(data.substring(0, 200) + '...');
          resolve({ status: 'ok', data });
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Matches API connection failed:', error.message);
      reject(error);
    });

    req.on('timeout', () => {
      console.error('❌ Matches API connection timeout');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

async function runTests() {
  try {
    await testBackend();
    await testMatchesAPI();
    console.log('\n✨ All backend tests passed!');
    console.log('\n🔍 If frontend still shows network errors, check:');
    console.log('1. Browser developer console for JavaScript errors');
    console.log('2. Network tab for failed API calls');
    console.log('3. CORS settings in backend');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Backend tests failed!');
    console.error('Error:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Make sure backend is running: cd backend && npm run dev');
    console.log('2. Check port 3031 is not blocked by firewall');
    console.log('3. Verify backend startup logs for errors');
    process.exit(1);
  }
}

runTests();
