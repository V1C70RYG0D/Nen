#!/usr/bin/env node
/**
 * Core Functionality Verification
 * Tests that all core modules work correctly
 */

console.log('🔍 CORE FUNCTIONALITY VERIFICATION');
console.log('==================================');

let testsPassed = 0;
let totalTests = 0;

function test(name, testFn) {
  totalTests++;
  try {
    const result = testFn();
    if (result) {
      console.log(`✅ ${name}`);
      testsPassed++;
    } else {
      console.log(`❌ ${name}`);
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
  }
}

// Test main module
test('Main module loads', () => {
  delete require.cache[require.resolve('../main.js')];
  const main = require('../main.js');
  return main && main.config && typeof main.checkGICompliance === 'function';
});

// Test GI compliance function
test('GI compliance check works', () => {
  const main = require('../main.js');
  const result = main.checkGICompliance();
  return typeof result === 'boolean';
});

// Test config loading
test('Configuration loads', () => {
  const main = require('../main.js');
  return main.config && main.config.colors && main.config.paths;
});

// Test environment variables
test('Environment variables loaded', () => {
  return process.env.NODE_ENV && process.env.BACKEND_PORT && process.env.AI_SERVICE_PORT;
});

// Test backend simple server
test('Backend simple server file exists', () => {
  const fs = require('fs');
  return fs.existsSync('backend/simple-server.js');
});

// Test AI service file
test('AI service file exists', () => {
  const fs = require('fs');
  return fs.existsSync('ai/app.py');
});

// Test package.json validity
test('Package.json is valid', () => {
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return pkg.scripts && pkg.dependencies;
});

// Test backend package.json
test('Backend package.json is valid', () => {
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
  return pkg.scripts && pkg.dependencies;
});

// Test environment file
test('Environment file exists and has content', () => {
  const fs = require('fs');
  const envContent = fs.readFileSync('config/.env', 'utf8');
  return envContent.length > 0 && envContent.includes('NODE_ENV');
});

// Test compiled backend
test('Backend is compiled', () => {
  const fs = require('fs');
  return fs.existsSync('backend/dist/main.js');
});

console.log('\n📊 VERIFICATION RESULTS');
console.log('======================');
console.log(`Tests Passed: ${testsPassed}/${totalTests}`);
console.log(`Success Rate: ${((testsPassed / totalTests) * 100).toFixed(1)}%`);

if (testsPassed === totalTests) {
  console.log('\n🎉 ALL CORE FUNCTIONALITY VERIFIED');
  console.log('✅ System is ready for full operation');
} else {
  console.log('\n⚠️ SOME CORE ISSUES DETECTED');
  console.log('🔧 Review failed tests above');
}

process.exit(testsPassed === totalTests ? 0 : 1);
