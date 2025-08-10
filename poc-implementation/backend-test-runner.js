#!/usr/bin/env node
/**
 * Backend Test Runner - GI Compliant
 * Tests the live backend server without mocks
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

async function waitForService(url, timeout = 30000) {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, resolve);
        req.on('error', reject);
        req.setTimeout(1000, () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });
      return true;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return false;
}

async function runBackendTests() {
  console.log('🔧 BACKEND JEST TEST RUNNER');
  console.log('===========================');
  
  // Check if backend is running
  console.log('🔍 Checking backend service...');
  const backendUrl = 'http://127.0.0.1:3011/health';
  
  if (!(await waitForService(backendUrl, 5000))) {
    console.log('❌ Backend service not running on port 3011');
    console.log('💡 Start backend first: cd backend && npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Backend service detected');
  
  // Change to backend directory
  const backendDir = path.join(__dirname, 'backend');
  process.chdir(backendDir);
  
  console.log('🧪 Running Jest tests...');
  
  // Run Jest with specific configuration
  const jest = spawn('npx', ['jest', '--config', 'jest.config.js', '--verbose', '--forceExit'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: '3011', // Use the running server port
      CI: 'true'
    }
  });
  
  jest.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ All backend tests passed!');
    } else {
      console.log(`\n❌ Backend tests failed with code ${code}`);
    }
    process.exit(code);
  });
  
  jest.on('error', (error) => {
    console.error('💥 Failed to run tests:', error);
    process.exit(1);
  });
}

runBackendTests().catch(console.error);
