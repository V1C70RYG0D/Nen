/**
 * User Account Initialization Validation Script
 * Tests User Story 1 - Requirement 4: Initialize user account if first-time connection
 * 
 * This script validates the complete flow of automatic user account initialization
 * when a wallet connects for the first time to the Nen Platform.
 */

const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function validateUserAccountInitialization() {
  console.log('🚀 User Account Initialization Validation');
  console.log('📖 Testing User Story 1 - Requirement 4');
  console.log('🎯 Goal: Verify automatic account initialization for new wallet connections\n');

  let passed = 0;
  let failed = 0;
  const results = [];

  const testWalletAddress = 'TestWallet' + Math.random().toString(36).substring(7);
  console.log(`🧪 Testing with wallet: ${testWalletAddress}\n`);

  // Helper function to run a test
  async function runTest(testName, testFn) {
    console.log(`📋 ${testName}...`);
    try {
      await testFn();
      console.log(`✅ ${testName} - PASSED\n`);
      passed++;
      results.push({ test: testName, status: 'PASSED' });
    } catch (error) {
      console.log(`❌ ${testName} - FAILED: ${error.message}\n`);
      failed++;
      results.push({ test: testName, status: 'FAILED', error: error.message });
    }
  }

  // Test 1: Automatic account initialization for first-time wallet
  await runTest('Automatic Account Initialization', async () => {
    const response = await fetch(`${baseURL}/api/user/check-and-initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        options: {
          autoInitialize: true,
          kycLevel: 0,
          region: 0,
          username: `testuser_${testWalletAddress.slice(-6)}`
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📊 Initialization result:', JSON.stringify(result, null, 2));

    if (!result.success) {
      throw new Error(result.error || 'Initialization failed');
    }

    if (!result.data.pdaAddress) {
      throw new Error('PDA address not returned');
    }

    if (result.data.initialized || result.data.accountExists) {
      console.log('✅ Account properly initialized or exists');
    } else {
      throw new Error('Account was not initialized');
    }
  });

  // Test 2: PDA derivation validation
  await runTest('PDA Derivation Validation', async () => {
    const response = await fetch(`${baseURL}/api/user/derive-pda/${testWalletAddress}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📊 PDA derivation result:', JSON.stringify(result, null, 2));

    if (!result.success) {
      throw new Error(result.error || 'PDA derivation failed');
    }

    if (!result.data.pdaAddress) {
      throw new Error('PDA address not derived');
    }

    if (result.data.walletAddress !== testWalletAddress) {
      throw new Error('Wallet address mismatch');
    }
  });

  // Test 3: Existing account handling
  await runTest('Existing Account Handling', async () => {
    // Call initialization again for the same wallet
    const response = await fetch(`${baseURL}/api/user/check-and-initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: testWalletAddress,
        options: {
          autoInitialize: true
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📊 Second check result:', JSON.stringify(result, null, 2));

    if (!result.success) {
      throw new Error(result.error || 'Second check failed');
    }

    if (!result.data.accountExists) {
      throw new Error('Account should exist after first initialization');
    }

    // Should not re-initialize
    if (result.data.initialized === true) {
      throw new Error('Account should not be re-initialized');
    }
  });

  // Test 4: Validation of required parameters
  await runTest('Parameter Validation', async () => {
    const response = await fetch(`${baseURL}/api/user/check-and-initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: '', // Empty wallet address
        options: {
          autoInitialize: true
        }
      }),
    });

    if (response.ok) {
      throw new Error('Should have rejected empty wallet address');
    }

    if (response.status !== 400) {
      throw new Error(`Expected 400 status, got ${response.status}`);
    }

    const result = await response.json();
    if (!result.error) {
      throw new Error('Should have returned error message');
    }
  });

  // Test 5: Auto-initialize disabled option
  await runTest('Auto-Initialize Disabled', async () => {
    const newTestWallet = 'TestWallet' + Math.random().toString(36).substring(7);
    
    const response = await fetch(`${baseURL}/api/user/check-and-initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: newTestWallet,
        options: {
          autoInitialize: false // Disabled
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📊 Auto-init disabled result:', JSON.stringify(result, null, 2));

    if (!result.success) {
      throw new Error(result.error || 'Request failed');
    }

    if (result.data.initialized === true) {
      throw new Error('Should not have initialized when autoInitialize is false');
    }
  });

  // Summary
  console.log('🏁 VALIDATION SUMMARY');
  console.log('=' * 50);
  console.log(`✅ Tests Passed: ${passed}`);
  console.log(`❌ Tests Failed: ${failed}`);
  console.log(`📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! User Account Initialization is working correctly.');
    console.log('✅ User Story 1 - Requirement 4 is FULLY IMPLEMENTED');
  } else {
    console.log('\n⚠️ Some tests failed. Review the issues above.');
    console.log('❌ User Story 1 - Requirement 4 needs additional work');
  }

  console.log('\n📋 DETAILED RESULTS:');
  results.forEach(result => {
    console.log(`  ${result.status === 'PASSED' ? '✅' : '❌'} ${result.test}`);
    if (result.error) {
      console.log(`    Error: ${result.error}`);
    }
  });

  return {
    passed,
    failed,
    successRate: (passed / (passed + failed)) * 100,
    results
  };
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateUserAccountInitialization()
    .then(result => {
      process.exit(result.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Validation script error:', error);
      process.exit(1);
    });
}

module.exports = {
  validateUserAccountInitialization,
  testName: 'User Account Initialization Validation',
  requirements: ['User Story 1 - Requirement 4'],
  description: 'Validates automatic user account initialization for first-time wallet connections'
};
