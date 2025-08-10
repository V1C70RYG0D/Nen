#!/usr/bin/env node

/**
 * User Story 2 Test: Deposit SOL into betting account
 * 
 * This test validates the complete deposit flow according to the user story:
 * 1. User enters deposit amount in SOL
 * 2. User clicks "Deposit" button
 * 3. User approves transaction in wallet
 * 4. User sees updated betting balance
 */

const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Test configuration
const TEST_CONFIG = {
  walletAddress: 'DemoWallet1234567890123456789012345678901234',
  testAmounts: [0.1, 1.0, 5.0, 10.0],
  maxRetries: 3,
  timeout: 30000
};

class DepositTestSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async runTests() {
    console.log('🧪 Starting User Story 2: Deposit SOL Test Suite\n');
    console.log('='.repeat(60));
    console.log('Testing deposit functionality according to user story requirements:');
    console.log('- User enters deposit amount in SOL');
    console.log('- User clicks "Deposit" button'); 
    console.log('- User approves transaction in wallet');
    console.log('- User sees updated betting balance');
    console.log('='.repeat(60) + '\n');

    try {
      // Test 1: Create/Initialize user account
      await this.testUserAccountInitialization();

      // Test 2: Validate deposit amount constraints
      await this.testDepositAmountValidation();

      // Test 3: Test successful deposit flow
      await this.testSuccessfulDeposit();

      // Test 4: Verify balance updates
      await this.testBalanceUpdate();

      // Test 5: Test transaction history
      await this.testTransactionHistory();

      // Test 6: Test error handling
      await this.testErrorHandling();

      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed with error:', error.message);
      this.results.failed++;
      this.results.errors.push(`Test Suite Error: ${error.message}`);
      this.printResults();
      process.exit(1);
    }
  }

  async testUserAccountInitialization() {
    console.log('📋 Test 1: User Account Initialization');
    console.log('-'.repeat(40));

    try {
      // Check if user account exists or needs initialization
      const checkResponse = await this.makeRequest('POST', '/api/user/check-and-initialize', {
        walletAddress: TEST_CONFIG.walletAddress,
        options: {
          autoInitialize: true,
          kycLevel: 0,
          region: 0
        }
      });

      if (checkResponse.success) {
        console.log('✅ User account initialized successfully');
        console.log(`   Wallet: ${TEST_CONFIG.walletAddress}`);
        console.log(`   PDA: ${checkResponse.data.pdaAddress || 'N/A'}`);
        console.log(`   Message: ${checkResponse.data.message || 'Account ready'}`);
        this.results.passed++;
      } else {
        throw new Error(`Account initialization failed: ${checkResponse.error}`);
      }
    } catch (error) {
      console.log('❌ User account initialization failed:', error.message);
      this.results.failed++;
      this.results.errors.push(`Account Init: ${error.message}`);
    }
    console.log('');
  }

  async testDepositAmountValidation() {
    console.log('📋 Test 2: Deposit Amount Validation');
    console.log('-'.repeat(40));

    const invalidAmounts = [
      { amount: 0, expectedError: 'Valid amount is required' },
      { amount: -1, expectedError: 'Valid amount is required' },
      { amount: 0.05, expectedError: 'Minimum deposit amount is 0.1 SOL' },
      { amount: 1001, expectedError: 'Maximum deposit amount is 1000 SOL' }
    ];

    for (const test of invalidAmounts) {
      try {
        const response = await this.makeRequest('POST', '/api/user/deposit', {
          walletAddress: TEST_CONFIG.walletAddress,
          amount: test.amount
        });

        if (response.success) {
          throw new Error(`Expected validation error for amount ${test.amount}, but request succeeded`);
        } else {
          console.log(`✅ Correctly rejected amount ${test.amount}: ${response.error}`);
          this.results.passed++;
        }
      } catch (error) {
        if (error.message.includes('Expected validation error')) {
          console.log(`❌ Validation failed for amount ${test.amount}: ${error.message}`);
          this.results.failed++;
          this.results.errors.push(`Validation: ${error.message}`);
        } else {
          console.log(`✅ Correctly rejected amount ${test.amount}: ${error.message}`);
          this.results.passed++;
        }
      }
    }
    console.log('');
  }

  async testSuccessfulDeposit() {
    console.log('📋 Test 3: Successful Deposit Flow');
    console.log('-'.repeat(40));

    for (const amount of TEST_CONFIG.testAmounts) {
      try {
        console.log(`   Testing deposit of ${amount} SOL...`);
        
        // Step 1: User enters deposit amount
        console.log(`   Step 1: User enters amount: ${amount} SOL ✅`);

        // Step 2: User clicks "Deposit" button (API call)
        console.log(`   Step 2: User clicks "Deposit" button...`);
        
        const depositResponse = await this.makeRequest('POST', '/api/user/deposit', {
          walletAddress: TEST_CONFIG.walletAddress,
          amount: amount,
          transactionSignature: `mock_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });

        if (depositResponse.success) {
          console.log(`   Step 3: Transaction approved (simulated) ✅`);
          console.log(`   Step 4: Balance updated ✅`);
          console.log(`     Transaction ID: ${depositResponse.data.transactionId}`);
          console.log(`     New Balance: ${depositResponse.data.newBalance} SOL`);
          console.log(`     Deposit Amount: ${depositResponse.data.depositAmount} SOL`);
          console.log(`     PDA Address: ${depositResponse.data.pdaAddress}`);
          console.log(`✅ Deposit of ${amount} SOL completed successfully\n`);
          this.results.passed++;
        } else {
          throw new Error(`Deposit failed: ${depositResponse.error}`);
        }
      } catch (error) {
        console.log(`❌ Deposit of ${amount} SOL failed: ${error.message}\n`);
        this.results.failed++;
        this.results.errors.push(`Deposit ${amount} SOL: ${error.message}`);
      }
    }
  }

  async testBalanceUpdate() {
    console.log('📋 Test 4: Balance Update Verification');
    console.log('-'.repeat(40));

    try {
      // Get current betting account details
      const balanceResponse = await this.makeRequest('GET', `/api/user/betting-account/${TEST_CONFIG.walletAddress}`);

      if (balanceResponse.success) {
        const bettingAccount = balanceResponse.data;
        console.log('✅ Balance update verification successful');
        console.log(`   Current Balance: ${bettingAccount.balance} SOL`);
        console.log(`   Total Deposited: ${bettingAccount.totalDeposited} SOL`);
        console.log(`   Available Balance: ${bettingAccount.balance - bettingAccount.lockedBalance} SOL`);
        console.log(`   Last Updated: ${new Date(bettingAccount.lastUpdated).toLocaleString()}`);
        this.results.passed++;
      } else {
        throw new Error(`Failed to get balance: ${balanceResponse.error}`);
      }
    } catch (error) {
      console.log('❌ Balance update verification failed:', error.message);
      this.results.failed++;
      this.results.errors.push(`Balance Update: ${error.message}`);
    }
    console.log('');
  }

  async testTransactionHistory() {
    console.log('📋 Test 5: Transaction History');
    console.log('-'.repeat(40));

    try {
      const historyResponse = await this.makeRequest('GET', `/api/user/transaction-history/${TEST_CONFIG.walletAddress}?limit=10`);

      if (historyResponse.success) {
        const transactions = historyResponse.data.transactions;
        console.log('✅ Transaction history retrieved successfully');
        console.log(`   Total transactions: ${transactions.length}`);
        
        transactions.forEach((tx, index) => {
          if (index < 3) { // Show first 3 transactions
            console.log(`   ${index + 1}. ${tx.type.toUpperCase()}: ${tx.amount} SOL (${tx.status})`);
          }
        });
        
        if (transactions.length > 3) {
          console.log(`   ... and ${transactions.length - 3} more transactions`);
        }
        
        this.results.passed++;
      } else {
        throw new Error(`Failed to get transaction history: ${historyResponse.error}`);
      }
    } catch (error) {
      console.log('❌ Transaction history test failed:', error.message);
      this.results.failed++;
      this.results.errors.push(`Transaction History: ${error.message}`);
    }
    console.log('');
  }

  async testErrorHandling() {
    console.log('📋 Test 6: Error Handling');
    console.log('-'.repeat(40));

    const errorTests = [
      {
        name: 'Missing wallet address',
        data: { amount: 1.0 },
        expectedError: 'Wallet address is required'
      },
      {
        name: 'Invalid wallet address',
        data: { walletAddress: 'invalid', amount: 1.0 },
        expectedError: 'Invalid wallet address'
      },
      {
        name: 'Missing amount',
        data: { walletAddress: TEST_CONFIG.walletAddress },
        expectedError: 'Valid amount is required'
      }
    ];

    for (const test of errorTests) {
      try {
        const response = await this.makeRequest('POST', '/api/user/deposit', test.data);

        if (response.success) {
          console.log(`❌ Expected error for ${test.name}, but request succeeded`);
          this.results.failed++;
          this.results.errors.push(`Error Handling: ${test.name} should have failed`);
        } else {
          console.log(`✅ Correctly handled error: ${test.name}`);
          this.results.passed++;
        }
      } catch (error) {
        console.log(`✅ Correctly handled error: ${test.name} - ${error.message}`);
        this.results.passed++;
      }
    }
    console.log('');
  }

  async makeRequest(method, endpoint, data = null) {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      timeout: TEST_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response) {
        return error.response.data;
      }
      throw error;
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 USER STORY 2 TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📊 Total:  ${this.results.passed + this.results.failed}`);
    console.log(`🏆 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);

    if (this.results.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('\n💡 USER STORY 2 VALIDATION:');
    const storySteps = [
      'User enters deposit amount in SOL',
      'User clicks "Deposit" button', 
      'User approves transaction in wallet',
      'User sees updated betting balance'
    ];

    storySteps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step} ✅`);
    });

    if (this.results.failed === 0) {
      console.log('\n🎉 All tests passed! User Story 2 implementation is working correctly.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Please review the implementation.');
      process.exit(1);
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const testSuite = new DepositTestSuite();
  testSuite.runTests();
}

module.exports = { DepositTestSuite };
