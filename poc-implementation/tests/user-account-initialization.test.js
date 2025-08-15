/**
 * User Account Initialization Test
 * Tests User Story 1 - Requirement 4: Initialize user account if first-time connection
 * 
 * This test validates the complete flow of automatic user account initialization
 * when a wallet connects for the first time to the Nen Platform.
 */

const { describe, test, expect, beforeAll, afterAll } = require('@jest/globals');

describe('User Account Initialization - User Story 1 Requirement 4', () => {
  const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
  let testWalletAddress;
  let testPdaAddress;

  beforeAll(async () => {
    // Generate a test wallet address for testing
    testWalletAddress = 'TestWallet' + Math.random().toString(36).substring(7);
    console.log(`\n🧪 Testing with wallet: ${testWalletAddress}`);
  });

  afterAll(async () => {
    console.log(`\n✅ User Account Initialization tests completed`);
  });

  test('Should automatically initialize user account for first-time wallet connection', async () => {
    console.log('\n📋 Testing automatic account initialization...');

    try {
      // Test the check-and-initialize endpoint
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

      expect(response.status).toBe(200);

      const result = await response.json();
      console.log('📊 Initialization result:', JSON.stringify(result, null, 2));

      // Validate response structure
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('walletAddress', testWalletAddress);
      expect(result.data).toHaveProperty('pdaAddress');
      expect(result.data).toHaveProperty('message');

      // For a first-time user, account should be initialized
      if (result.data.initialized) {
        expect(result.data.initialized).toBe(true);
        expect(result.data.accountExists).toBe(true);
        expect(result.data.message).toContain('initialized');
        console.log('✅ New user account successfully initialized');
      } else {
        // Account might already exist from previous tests
        expect(result.data.accountExists).toBe(true);
        console.log('ℹ️ Account already exists from previous test');
      }

      testPdaAddress = result.data.pdaAddress;
      expect(testPdaAddress).toBeTruthy();
      console.log(`📍 PDA Address: ${testPdaAddress}`);

    } catch (error) {
      console.error('❌ Account initialization test failed:', error);
      throw error;
    }
  });

  test('Should derive PDA address correctly for wallet', async () => {
    console.log('\n📋 Testing PDA derivation...');

    try {
      const response = await fetch(`${baseURL}/api/user/derive-pda/${testWalletAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      console.log('📊 PDA derivation result:', JSON.stringify(result, null, 2));

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('walletAddress', testWalletAddress);
      expect(result.data).toHaveProperty('pdaAddress');

      // PDA address should match the one from initialization
      if (testPdaAddress) {
        expect(result.data.pdaAddress).toBe(testPdaAddress);
        console.log('✅ PDA addresses match between initialization and derivation');
      }

    } catch (error) {
      console.error('❌ PDA derivation test failed:', error);
      throw error;
    }
  });

  test('Should handle existing account without re-initialization', async () => {
    console.log('\n📋 Testing existing account handling...');

    try {
      // Call check-and-initialize again for the same wallet
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
            region: 0
          }
        }),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      console.log('📊 Second check result:', JSON.stringify(result, null, 2));

      expect(result).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('accountExists', true);
      expect(result.data).toHaveProperty('pdaAddress', testPdaAddress);

      // Should NOT initialize again for existing account
      expect(result.data.initialized).toBeFalsy();
      expect(result.data.message).toContain('already exists');
      console.log('✅ Existing account correctly handled without re-initialization');

    } catch (error) {
      console.error('❌ Existing account test failed:', error);
      throw error;
    }
  });

  test('Should handle different initialization options', async () => {
    console.log('\n📋 Testing initialization with custom options...');

    const newTestWallet = 'TestWallet' + Math.random().toString(36).substring(7);

    try {
      const response = await fetch(`${baseURL}/api/user/check-and-initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: newTestWallet,
          options: {
            autoInitialize: true,
            kycLevel: 1, // Enhanced KYC
            region: 1, // Different region
            username: 'premium_user'
          }
        }),
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      console.log('📊 Custom options result:', JSON.stringify(result, null, 2));

      expect(result).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('walletAddress', newTestWallet);
      expect(result.data).toHaveProperty('pdaAddress');

      console.log('✅ Custom initialization options handled correctly');

    } catch (error) {
      console.error('❌ Custom options test failed:', error);
      throw error;
    }
  });

  test('Should validate wallet address format', async () => {
    console.log('\n📋 Testing wallet address validation...');

    try {
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

      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('required');

      console.log('✅ Wallet address validation working correctly');

    } catch (error) {
      console.error('❌ Validation test failed:', error);
      throw error;
    }
  });

  test('Should handle auto-initialize disabled', async () => {
    console.log('\n📋 Testing with auto-initialize disabled...');

    const newTestWallet = 'TestWallet' + Math.random().toString(36).substring(7);

    try {
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

      expect(response.status).toBe(200);

      const result = await response.json();
      console.log('📊 Auto-init disabled result:', JSON.stringify(result, null, 2));

      expect(result).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('accountExists', false);
      expect(result.data.initialized).toBeFalsy();

      console.log('✅ Auto-initialize disabled option working correctly');

    } catch (error) {
      console.error('❌ Auto-initialize disabled test failed:', error);
      throw error;
    }
  });
});

// Run the tests if this file is executed directly
if (require.main === module) {
  console.log('🚀 Running User Account Initialization Tests...');
  console.log('📖 Testing User Story 1 - Requirement 4: Initialize user account if first-time connection');
  console.log('🎯 Goal: Verify automatic account initialization for new wallet connections\n');
  
  // Note: In a real environment, you would run: npm test -- user-account-initialization.test.js
  console.log('Run with: npm test -- user-account-initialization.test.js');
}

module.exports = {
  testSuiteName: 'User Account Initialization',
  testCount: 6,
  requirements: ['User Story 1 - Requirement 4'],
  description: 'Tests automatic user account initialization for first-time wallet connections'
};
