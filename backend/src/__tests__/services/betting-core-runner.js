/**
 * Simple Test Runner for Betting Core Functionality
 *
 * This is a standalone test runner that validates the betting core functionality
 * without requiring the full test suite infrastructure to work perfectly.
 *
 * Following GI.md guidelines for production-ready testing and verification.
 */

// Import required modules
const { EnhancedBettingService } = require('../../services/EnhancedBettingService');
const { BettingService } = require('../../services/BettingService');
const { OptimizedBettingService } = require('../../services/OptimizedBettingService');
const { LAMPORTS_PER_SOL } = require('@solana/web3.js');

// Test configuration
const TEST_CONFIG = {
  mockMatchId: 'test-match-123',
  mockBettorWallet: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
  mockAgentId: 'royal_guard_alpha',
  validBetAmount: 1.5,
  minBetAmount: 0.1,
  maxBetAmount: 100
};

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

// Test helper functions
function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ PASS: ${message}`);
    testResults.push({ status: 'PASS', message });
  } else {
    failedTests++;
    console.log(`❌ FAIL: ${message}`);
    testResults.push({ status: 'FAIL', message });
  }
}

function assertEqual(actual, expected, message) {
  const condition = actual === expected;
  assert(condition, `${message} (expected: ${expected}, actual: ${actual})`);
}

function assertDefined(value, message) {
  assert(value !== undefined && value !== null, `${message} should be defined`);
}

function assertGreaterThan(actual, threshold, message) {
  assert(actual > threshold, `${message} (${actual} > ${threshold})`);
}

function assertWithinRange(value, min, max, message) {
  assert(value >= min && value <= max, `${message} (${min} <= ${value} <= ${max})`);
}

// Mock environment setup
function setupTestEnvironment() {
  process.env.NODE_ENV = 'test';
  process.env.MIN_BET_LAMPORTS = (TEST_CONFIG.minBetAmount * LAMPORTS_PER_SOL).toString();
  process.env.MAX_BET_LAMPORTS = (TEST_CONFIG.maxBetAmount * LAMPORTS_PER_SOL).toString();
  process.env.PLATFORM_FEE_BPS = '300'; // 3%
  process.env.TREASURY_WALLET = 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS';
  process.env.SOLANA_RPC_URL = 'https://api.devnet.solana.com';
  process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
}

// Test Suite 1: Service Initialization
async function testServiceInitialization() {
  console.log('\n🧪 Test Suite 1: Service Initialization');

  try {
    const enhancedService = new EnhancedBettingService();
    assertDefined(enhancedService, 'EnhancedBettingService initialization');

    const bettingService = new BettingService();
    assertDefined(bettingService, 'BettingService initialization');

    const optimizedService = new OptimizedBettingService();
    assertDefined(optimizedService, 'OptimizedBettingService initialization');

  } catch (error) {
    assert(false, `Service initialization failed: ${error.message}`);
  }
}

// Test Suite 2: Betting Pool Creation
async function testBettingPoolCreation() {
  console.log('\n🧪 Test Suite 2: Betting Pool Creation');

  try {
    const enhancedService = new EnhancedBettingService();

    // Test betting pool creation
    const pool = await enhancedService.createBettingPool(TEST_CONFIG.mockMatchId);
    assertDefined(pool, 'Betting pool creation');

    if (pool) {
      assertEqual(pool.matchId, TEST_CONFIG.mockMatchId, 'Pool match ID');
      assertEqual(pool.isActive, true, 'Pool active status');
      assertEqual(pool.totalPool, 0, 'Initial pool total');
      assertEqual(pool.betsCount, 0, 'Initial bets count');
    }

  } catch (error) {
    assert(false, `Betting pool creation failed: ${error.message}`);
  }
}

// Test Suite 3: Bet Amount Validation
async function testBetAmountValidation() {
  console.log('\n🧪 Test Suite 3: Bet Amount Validation');

  try {
    const enhancedService = new EnhancedBettingService();
    await enhancedService.createBettingPool(TEST_CONFIG.mockMatchId);

    // Test valid minimum amount
    try {
      const bet = await enhancedService.placeBet(
        TEST_CONFIG.mockBettorWallet,
        TEST_CONFIG.mockMatchId,
        TEST_CONFIG.minBetAmount * LAMPORTS_PER_SOL,
        TEST_CONFIG.mockAgentId,
        'ai_agent'
      );
      assertDefined(bet, 'Minimum valid bet amount');
    } catch (error) {
      assert(false, `Minimum bet amount should be valid: ${error.message}`);
    }

    // Test invalid amount (too low)
    try {
      await enhancedService.placeBet(
        TEST_CONFIG.mockBettorWallet,
        TEST_CONFIG.mockMatchId,
        0.05 * LAMPORTS_PER_SOL,
        TEST_CONFIG.mockAgentId,
        'ai_agent'
      );
      assert(false, 'Should reject bet amount below minimum');
    } catch (error) {
      assert(true, 'Correctly rejects bet amount below minimum');
    }

    // Test invalid amount (too high)
    try {
      await enhancedService.placeBet(
        TEST_CONFIG.mockBettorWallet,
        TEST_CONFIG.mockMatchId,
        101 * LAMPORTS_PER_SOL,
        TEST_CONFIG.mockAgentId,
        'ai_agent'
      );
      assert(false, 'Should reject bet amount above maximum');
    } catch (error) {
      assert(true, 'Correctly rejects bet amount above maximum');
    }

  } catch (error) {
    assert(false, `Bet amount validation failed: ${error.message}`);
  }
}

// Test Suite 4: Valid Bet Placement
async function testValidBetPlacement() {
  console.log('\n🧪 Test Suite 4: Valid Bet Placement');

  try {
    const enhancedService = new EnhancedBettingService();
    await enhancedService.createBettingPool(TEST_CONFIG.mockMatchId);

    const betData = await enhancedService.placeBet(
      TEST_CONFIG.mockBettorWallet,
      TEST_CONFIG.mockMatchId,
      TEST_CONFIG.validBetAmount * LAMPORTS_PER_SOL,
      TEST_CONFIG.mockAgentId,
      'ai_agent'
    );

    // Validate bet data structure
    assertDefined(betData.id, 'Bet ID');
    assertEqual(betData.matchId, TEST_CONFIG.mockMatchId, 'Bet match ID');
    assertEqual(betData.bettorWallet, TEST_CONFIG.mockBettorWallet, 'Bettor wallet');
    assertEqual(betData.amount, TEST_CONFIG.validBetAmount * LAMPORTS_PER_SOL, 'Bet amount');
    assertEqual(betData.predictedWinner, TEST_CONFIG.mockAgentId, 'Predicted winner');
    assertEqual(betData.predictedWinnerType, 'ai_agent', 'Winner type');
    assertEqual(betData.status, 'active', 'Bet status');

    // Validate calculated fields
    assertGreaterThan(betData.odds, 1.0, 'Odds greater than 1.0');
    assertWithinRange(betData.odds, 1.01, 10.0, 'Odds within valid range');
    assertGreaterThan(betData.potentialPayout, betData.amount, 'Potential payout > bet amount');
    assertDefined(betData.placedAt, 'Placed timestamp');
    assertDefined(betData.escrowAccount, 'Escrow account');

  } catch (error) {
    assert(false, `Valid bet placement failed: ${error.message}`);
  }
}

// Test Suite 5: Optimized Service Performance
async function testOptimizedServicePerformance() {
  console.log('\n🧪 Test Suite 5: Optimized Service Performance');

  try {
    const optimizedService = new OptimizedBettingService();

    const startTime = Date.now();
    const result = await optimizedService.placeBet(
      TEST_CONFIG.mockBettorWallet,
      TEST_CONFIG.mockMatchId,
      TEST_CONFIG.validBetAmount,
      TEST_CONFIG.mockAgentId,
      'ai_agent'
    );
    const responseTime = Date.now() - startTime;

    assertEqual(result.success, true, 'Optimized service success response');
    assertDefined(result.betId, 'Optimized service bet ID');
    assertDefined(result.message, 'Optimized service message');

    // Performance validation
    assert(responseTime < 1000, `Response time under 1 second (${responseTime}ms)`);

  } catch (error) {
    assert(false, `Optimized service test failed: ${error.message}`);
  }
}

// Test Suite 6: Pool Updates
async function testPoolUpdates() {
  console.log('\n🧪 Test Suite 6: Pool Updates');

  try {
    const enhancedService = new EnhancedBettingService();
    await enhancedService.createBettingPool(TEST_CONFIG.mockMatchId);

    // Get initial pool state
    const initialPool = await enhancedService.getBettingPool(TEST_CONFIG.mockMatchId);
    const initialTotal = initialPool.totalPool;
    const initialCount = initialPool.betsCount;

    // Place a bet
    await enhancedService.placeBet(
      TEST_CONFIG.mockBettorWallet,
      TEST_CONFIG.mockMatchId,
      TEST_CONFIG.validBetAmount * LAMPORTS_PER_SOL,
      TEST_CONFIG.mockAgentId,
      'ai_agent'
    );

    // Verify pool updates
    const updatedPool = await enhancedService.getBettingPool(TEST_CONFIG.mockMatchId);
    assertEqual(updatedPool.totalPool, initialTotal + (TEST_CONFIG.validBetAmount * LAMPORTS_PER_SOL), 'Pool total updated');
    assertEqual(updatedPool.betsCount, initialCount + 1, 'Pool bet count updated');

  } catch (error) {
    assert(false, `Pool updates test failed: ${error.message}`);
  }
}

// Test Suite 7: Edge Cases
async function testEdgeCases() {
  console.log('\n🧪 Test Suite 7: Edge Cases');

  try {
    const enhancedService = new EnhancedBettingService();

    // Test betting on non-existent match
    try {
      await enhancedService.placeBet(
        TEST_CONFIG.mockBettorWallet,
        'non-existent-match',
        TEST_CONFIG.validBetAmount * LAMPORTS_PER_SOL,
        TEST_CONFIG.mockAgentId,
        'ai_agent'
      );
      assert(false, 'Should reject bet on non-existent match');
    } catch (error) {
      assert(true, 'Correctly rejects bet on non-existent match');
    }

    // Test multiple bets from same user
    await enhancedService.createBettingPool(TEST_CONFIG.mockMatchId);

    const bet1 = await enhancedService.placeBet(
      TEST_CONFIG.mockBettorWallet,
      TEST_CONFIG.mockMatchId,
      0.5 * LAMPORTS_PER_SOL,
      'agent1',
      'ai_agent'
    );

    const bet2 = await enhancedService.placeBet(
      TEST_CONFIG.mockBettorWallet,
      TEST_CONFIG.mockMatchId,
      0.7 * LAMPORTS_PER_SOL,
      'agent2',
      'ai_agent'
    );

    assert(bet1.id !== bet2.id, 'Multiple bets have unique IDs');
    assert(bet1.predictedWinner !== bet2.predictedWinner, 'Bets on different agents allowed');

  } catch (error) {
    assert(false, `Edge cases test failed: ${error.message}`);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Betting Core Functionality Tests');
  console.log('='.repeat(50));

  setupTestEnvironment();

  // Run all test suites
  await testServiceInitialization();
  await testBettingPoolCreation();
  await testBetAmountValidation();
  await testValidBetPlacement();
  await testOptimizedServicePerformance();
  await testPoolUpdates();
  await testEdgeCases();

  // Print final results
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (failedTests > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.filter(r => r.status === 'FAIL').forEach(result => {
      console.log(`  - ${result.message}`);
    });
  }

  console.log('\n' + '='.repeat(50));
  console.log(passedTests === totalTests ? '🎉 All tests passed!' : '⚠️  Some tests failed');

  return {
    total: totalTests,
    passed: passedTests,
    failed: failedTests,
    successRate: (passedTests / totalTests) * 100,
    results: testResults
  };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  TEST_CONFIG
};
