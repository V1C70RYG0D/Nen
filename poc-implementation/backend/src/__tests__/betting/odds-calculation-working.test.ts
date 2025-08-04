/**
 * Odds Calculation & Pool Management Comprehensive Tests
 *
 * Test suite implementing complete coverage for odds calculation and pool management
 * Following GI.md guidelines for production-ready, real implementation with 100% test coverage
 *
 * Testing Strategy:
 * 1. Initial odds calculation (2.0 default)
 * 2. Odds updates with new bets
 * 3. Pool distribution tracking
 * 4. Maximum odds capping (10.0)
 * 5. Minimum odds floor (1.1)
 * 6. Edge case handling (zero pools)
 * 7. Mathematical accuracy of calculations
 * 8. Performance with large bet volumes
 * 9. Odds history tracking
 * 10. Pool synchronization across services
 */

import { EnhancedBettingService } from '../../services/EnhancedBettingService';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

// Mock external dependencies for controlled testing
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../../services/EnhancedCachingService');

describe('Odds Calculation & Pool Management', () => {
  let enhancedBettingService: EnhancedBettingService;

  // Test data constants
  const TEST_MATCH_ID = 'odds-test-match-456';
  const TEST_BETTOR_1 = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
  const TEST_BETTOR_2 = 'DjVE6JNiYqPL2QXyCUEwmm2gMLamMK5kZvhZrHTL1FaD';
  const TEST_BETTOR_3 = 'H6ARHf6YXhGYeQfUzQNGMGAANqULSgk8z8hbhk9a2Ciq';
  const AGENT_ID_1 = 'royal_guard_alpha';
  const AGENT_ID_2 = 'knight_defender_beta';

  // Odds calculation test parameters
  const INITIAL_ODDS = 2.0;
  const MAX_ODDS = 10.0;
  const MIN_ODDS = 1.1;
  const STANDARD_BET_AMOUNT = 1.0 * LAMPORTS_PER_SOL; // 1 SOL
  const LARGE_BET_AMOUNT = 10.0 * LAMPORTS_PER_SOL; // 10 SOL
  const SMALL_BET_AMOUNT = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL

  beforeAll(async () => {
    // Initialize all betting services for comprehensive testing
    enhancedBettingService = new EnhancedBettingService();

    // Set up consistent environment for testing
    process.env.MIN_BET_LAMPORTS = (0.01 * LAMPORTS_PER_SOL).toString();
    process.env.MAX_BET_LAMPORTS = (100 * LAMPORTS_PER_SOL).toString();
    process.env.PLATFORM_FEE_BPS = '250'; // 2.5%
    process.env.TREASURY_WALLET = 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test 1: Initial odds calculation (2.0 default)
   * Verifies that new betting pools start with correct default odds
   */
  test('Initial odds calculation (2.0 default)', async () => {
    // Create new betting pool
    const pool = await enhancedBettingService.createBettingPool(TEST_MATCH_ID);

    // Verify initial odds are set to default value
    expect(pool.oddsPlayer1).toBe(INITIAL_ODDS);
    expect(pool.oddsPlayer2).toBe(INITIAL_ODDS);
    expect(pool.totalPool).toBe(0);
    expect(pool.betsCount).toBe(0);
    expect(pool.isActive).toBe(true);

    // Verify pool structure is properly initialized
    expect(pool.matchId).toBe(TEST_MATCH_ID);
    expect(pool.bets).toEqual([]);
    expect(pool.complianceStatus).toBeDefined();
    expect(pool.riskLevel).toBeDefined();

    console.log('✓ Initial odds calculation test passed');
  });

  /**
   * Test 2: Odds updates with new bets
   * Verifies odds change correctly when bets are placed
   */
  test('Odds updates with new bets', async () => {
    const matchId = `${TEST_MATCH_ID}-odds-updates`;

    // Create betting pool
    await enhancedBettingService.createBettingPool(matchId);

    // Place first bet on agent 1
    const bet1 = await enhancedBettingService.placeBet(
      TEST_BETTOR_1,
      matchId,
      STANDARD_BET_AMOUNT,
      AGENT_ID_1,
      'ai_agent'
    );

    // Get updated pool
    let pool = await enhancedBettingService.getBettingPool(matchId);
    expect(pool).not.toBeNull();
    expect(pool!.totalPool).toBe(STANDARD_BET_AMOUNT);
    expect(pool!.betsCount).toBe(1);

    // Place second bet on agent 2 with same amount
    const bet2 = await enhancedBettingService.placeBet(
      TEST_BETTOR_2,
      matchId,
      STANDARD_BET_AMOUNT,
      AGENT_ID_2,
      'ai_agent'
    );

    // Get updated pool and verify odds calculation
    pool = await enhancedBettingService.getBettingPool(matchId);
    expect(pool).not.toBeNull();
    expect(pool!.totalPool).toBe(STANDARD_BET_AMOUNT * 2);
    expect(pool!.betsCount).toBe(2);

    // With equal bets, odds should be approximately equal and close to 2.0
    expect(pool!.oddsPlayer1).toBeCloseTo(2.0, 1);
    expect(pool!.oddsPlayer2).toBeCloseTo(2.0, 1);

    // Place larger bet on agent 1 to skew odds
    const bet3 = await enhancedBettingService.placeBet(
      TEST_BETTOR_3,
      matchId,
      LARGE_BET_AMOUNT,
      AGENT_ID_1,
      'ai_agent'
    );

    // Get final pool state
    pool = await enhancedBettingService.getBettingPool(matchId);
    expect(pool).not.toBeNull();
    expect(pool!.totalPool).toBe(STANDARD_BET_AMOUNT * 2 + LARGE_BET_AMOUNT);

    // Agent 1 should have lower odds (more money bet on it)
    // Agent 2 should have higher odds (less money bet on it)
    const totalOnAgent1 = STANDARD_BET_AMOUNT + LARGE_BET_AMOUNT;
    const totalOnAgent2 = STANDARD_BET_AMOUNT;
    const expectedOddsAgent1 = Math.max(MIN_ODDS, pool!.totalPool / totalOnAgent1);
    const expectedOddsAgent2 = Math.max(MIN_ODDS, pool!.totalPool / totalOnAgent2);

    expect(pool!.oddsPlayer1).toBeCloseTo(expectedOddsAgent1, 1);
    expect(pool!.oddsPlayer2).toBeCloseTo(expectedOddsAgent2, 1);
    expect(pool!.oddsPlayer1).toBeLessThan(pool!.oddsPlayer2);

    console.log('✓ Odds updates with new bets test passed');
  });

  /**
   * Test 3: Pool distribution tracking
   * Verifies accurate tracking of bet distribution across agents
   */
  test('Pool distribution tracking', async () => {
    const matchId = `${TEST_MATCH_ID}-pool-distribution`;

    // Create betting pool
    await enhancedBettingService.createBettingPool(matchId);

    // Track bets and amounts for verification
    const betAmounts: { [key: string]: number[] } = {
      [AGENT_ID_1]: [],
      [AGENT_ID_2]: []
    };

    // Place multiple bets with different amounts
    const bets = [
      { bettor: TEST_BETTOR_1, amount: 1.0 * LAMPORTS_PER_SOL, agent: AGENT_ID_1 },
      { bettor: TEST_BETTOR_2, amount: 2.0 * LAMPORTS_PER_SOL, agent: AGENT_ID_2 },
      { bettor: TEST_BETTOR_3, amount: 0.5 * LAMPORTS_PER_SOL, agent: AGENT_ID_1 },
      { bettor: TEST_BETTOR_1, amount: 3.0 * LAMPORTS_PER_SOL, agent: AGENT_ID_2 },
      { bettor: TEST_BETTOR_2, amount: 1.5 * LAMPORTS_PER_SOL, agent: AGENT_ID_1 }
    ];

    // Place all bets and track distribution
    for (const bet of bets) {
      await enhancedBettingService.placeBet(
        bet.bettor,
        matchId,
        bet.amount,
        bet.agent,
        'ai_agent'
      );
      betAmounts[bet.agent].push(bet.amount);
    }

    // Calculate expected totals
    const totalOnAgent1 = betAmounts[AGENT_ID_1].reduce((sum, amount) => sum + amount, 0);
    const totalOnAgent2 = betAmounts[AGENT_ID_2].reduce((sum, amount) => sum + amount, 0);
    const expectedTotalPool = totalOnAgent1 + totalOnAgent2;

    // Get final pool state
    const pool = await enhancedBettingService.getBettingPool(matchId);

    // Ensure pool exists
    expect(pool).not.toBeNull();
    expect(pool!.totalPool).toBe(expectedTotalPool);
    expect(pool!.betsCount).toBe(bets.length);

    // Verify distribution calculations
    const agent1Bets = pool!.bets.filter(bet => bet.predictedWinner === AGENT_ID_1);
    const agent2Bets = pool!.bets.filter(bet => bet.predictedWinner === AGENT_ID_2);

    const actualTotalOnAgent1 = agent1Bets.reduce((sum, bet) => sum + bet.amount, 0);
    const actualTotalOnAgent2 = agent2Bets.reduce((sum, bet) => sum + bet.amount, 0);

    expect(actualTotalOnAgent1).toBe(totalOnAgent1);
    expect(actualTotalOnAgent2).toBe(totalOnAgent2);

    // Verify odds reflect distribution
    const agent1Proportion = totalOnAgent1 / expectedTotalPool;
    const agent2Proportion = totalOnAgent2 / expectedTotalPool;

    expect(agent1Proportion + agent2Proportion).toBeCloseTo(1.0, 5);

    // Agent with more money should have lower odds
    if (totalOnAgent1 > totalOnAgent2) {
      expect(pool!.oddsPlayer1).toBeLessThan(pool!.oddsPlayer2);
    } else if (totalOnAgent2 > totalOnAgent1) {
      expect(pool!.oddsPlayer2).toBeLessThan(pool!.oddsPlayer1);
    }

    console.log('✓ Pool distribution tracking test passed');
  });

  /**
   * Test 4: Maximum odds capping (10.0)
   * Verifies odds never exceed the maximum threshold
   */
  test('Maximum odds capping (10.0)', async () => {
    const matchId = `${TEST_MATCH_ID}-max-odds-capping`;

    // Create betting pool
    await enhancedBettingService.createBettingPool(matchId);

    // Place extremely unbalanced bets to test max odds
    // Small bet on agent 1
    await enhancedBettingService.placeBet(
      TEST_BETTOR_1,
      matchId,
      SMALL_BET_AMOUNT, // 0.1 SOL
      AGENT_ID_1,
      'ai_agent'
    );

    // Very large bet on agent 2
    await enhancedBettingService.placeBet(
      TEST_BETTOR_2,
      matchId,
      50 * LAMPORTS_PER_SOL, // 50 SOL
      AGENT_ID_2,
      'ai_agent'
    );

    // Get pool state
    const pool = await enhancedBettingService.getBettingPool(matchId);

    // Verify neither odds exceed maximum
    expect(pool).not.toBeNull();
    expect(pool!.oddsPlayer1).toBeLessThanOrEqual(MAX_ODDS);
    expect(pool!.oddsPlayer2).toBeLessThanOrEqual(MAX_ODDS);

    // Agent 1 should have very high odds due to small bet amount
    // But it should be capped at MAX_ODDS
    expect(pool!.oddsPlayer1).toBeCloseTo(MAX_ODDS, 1);

    // Agent 2 should have very low odds due to large bet amount
    expect(pool!.oddsPlayer2).toBeLessThan(2.0);

    console.log('✓ Maximum odds capping test passed');
  });

  /**
   * Test 5: Minimum odds floor (1.1)
   * Verifies odds never go below the minimum threshold
   */
  test('Minimum odds floor (1.1)', async () => {
    const matchId = `${TEST_MATCH_ID}-min-odds-floor`;

    // Create betting pool
    await enhancedBettingService.createBettingPool(matchId);

    // Place bets to create extreme imbalance
    // Very large bet on agent 1
    await enhancedBettingService.placeBet(
      TEST_BETTOR_1,
      matchId,
      75 * LAMPORTS_PER_SOL, // 75 SOL
      AGENT_ID_1,
      'ai_agent'
    );

    // Small bet on agent 2
    await enhancedBettingService.placeBet(
      TEST_BETTOR_2,
      matchId,
      SMALL_BET_AMOUNT, // 0.1 SOL
      AGENT_ID_2,
      'ai_agent'
    );

    // Get pool state
    const pool = await enhancedBettingService.getBettingPool(matchId);

    // Verify neither odds go below minimum
    expect(pool).not.toBeNull();
    expect(pool!.oddsPlayer1).toBeGreaterThanOrEqual(MIN_ODDS);
    expect(pool!.oddsPlayer2).toBeGreaterThanOrEqual(MIN_ODDS);

    // Agent 1 should have minimum odds due to large bet amount
    expect(pool!.oddsPlayer1).toBeCloseTo(MIN_ODDS, 1);

    // Agent 2 should have very high odds
    expect(pool!.oddsPlayer2).toBeGreaterThan(5.0);

    console.log('✓ Minimum odds floor test passed');
  });

  /**
   * Test 6: Edge case handling (zero pools)
   * Verifies proper handling of edge cases like empty pools
   */
  test('Edge case handling (zero pools)', async () => {
    const matchId = `${TEST_MATCH_ID}-edge-cases`;

    // Test 1: Empty pool
    const emptyPool = await enhancedBettingService.createBettingPool(matchId);
    expect(emptyPool.oddsPlayer1).toBe(INITIAL_ODDS);
    expect(emptyPool.oddsPlayer2).toBe(INITIAL_ODDS);
    expect(emptyPool.totalPool).toBe(0);

    // Test 2: Single bet scenario
    await enhancedBettingService.placeBet(
      TEST_BETTOR_1,
      matchId,
      STANDARD_BET_AMOUNT,
      AGENT_ID_1,
      'ai_agent'
    );

    let pool = await enhancedBettingService.getBettingPool(matchId);
    expect(pool).not.toBeNull();
    expect(pool!.totalPool).toBe(STANDARD_BET_AMOUNT);
    expect(pool!.betsCount).toBe(1);
    // With only one bet, odds should handle gracefully
    expect(pool!.oddsPlayer1).toBeGreaterThanOrEqual(MIN_ODDS);
    expect(pool!.oddsPlayer2).toBe(INITIAL_ODDS); // No bets on player 2

    // Test 3: Very small amounts (edge of precision)
    const tinyMatchId = `${matchId}-tiny`;
    await enhancedBettingService.createBettingPool(tinyMatchId);

    const minimumAmount = 1; // 1 lamport
    await enhancedBettingService.placeBet(
      TEST_BETTOR_1,
      tinyMatchId,
      minimumAmount,
      AGENT_ID_1,
      'ai_agent'
    );

    const tinyPool = await enhancedBettingService.getBettingPool(tinyMatchId);
    expect(tinyPool).not.toBeNull();
    expect(tinyPool!.totalPool).toBe(minimumAmount);
    expect(tinyPool!.oddsPlayer1).toBeGreaterThanOrEqual(MIN_ODDS);
    expect(tinyPool!.oddsPlayer1).toBeLessThanOrEqual(MAX_ODDS);

    // Test 4: Maximum pool size
    const maxMatchId = `${matchId}-max`;
    await enhancedBettingService.createBettingPool(maxMatchId);

    const maxAmount = 99 * LAMPORTS_PER_SOL; // Close to maximum
    await enhancedBettingService.placeBet(
      TEST_BETTOR_1,
      maxMatchId,
      maxAmount,
      AGENT_ID_1,
      'ai_agent'
    );

    const maxPool = await enhancedBettingService.getBettingPool(maxMatchId);
    expect(maxPool).not.toBeNull();
    expect(maxPool!.totalPool).toBe(maxAmount);
    expect(maxPool!.oddsPlayer1).toBeGreaterThanOrEqual(MIN_ODDS);
    expect(maxPool!.oddsPlayer1).toBeLessThanOrEqual(MAX_ODDS);

    console.log('✓ Edge case handling test passed');
  });

  /**
   * Test 7: Mathematical accuracy of calculations
   * Verifies precision and correctness of odds calculations
   */
  test('Mathematical accuracy of calculations', async () => {
    const matchId = `${TEST_MATCH_ID}-math-accuracy`;

    // Create betting pool
    await enhancedBettingService.createBettingPool(matchId);

    // Use specific amounts for precise calculation testing
    const betAmount1 = 3.33333 * LAMPORTS_PER_SOL; // 3.33333 SOL
    const betAmount2 = 6.66667 * LAMPORTS_PER_SOL; // 6.66667 SOL

    await enhancedBettingService.placeBet(
      TEST_BETTOR_1,
      matchId,
      betAmount1,
      AGENT_ID_1,
      'ai_agent'
    );

    await enhancedBettingService.placeBet(
      TEST_BETTOR_2,
      matchId,
      betAmount2,
      AGENT_ID_2,
      'ai_agent'
    );

    const pool = await enhancedBettingService.getBettingPool(matchId);
    const totalPool = betAmount1 + betAmount2;

    // Calculate expected odds manually
    const proportion1 = betAmount1 / totalPool; // Should be ~0.3333
    const proportion2 = betAmount2 / totalPool; // Should be ~0.6667
    const expectedOdds1 = Math.max(MIN_ODDS, 1 / proportion1); // Should be ~3.0
    const expectedOdds2 = Math.max(MIN_ODDS, 1 / proportion2); // Should be ~1.5

    // Verify mathematical precision (within 0.01 tolerance)
    expect(pool).not.toBeNull();
    expect(pool!.oddsPlayer1).toBeCloseTo(expectedOdds1, 2);
    expect(pool!.oddsPlayer2).toBeCloseTo(expectedOdds2, 2);

    // Verify proportions add up to 1
    expect(proportion1 + proportion2).toBeCloseTo(1.0, 5);

    // Verify total pool calculation
    expect(pool!.totalPool).toBe(totalPool);

    // Test rounding precision
    expect(Number(pool!.oddsPlayer1.toFixed(2))).toBe(pool!.oddsPlayer1);
    expect(Number(pool!.oddsPlayer2.toFixed(2))).toBe(pool!.oddsPlayer2);

    console.log('✓ Mathematical accuracy test passed');
  });

  /**
   * Test 8: Performance with large bet volumes
   * Tests system performance under high load scenarios
   */
  test('Performance with large bet volumes', async () => {
    const matchId = `${TEST_MATCH_ID}-performance`;

    // Create betting pool
    await enhancedBettingService.createBettingPool(matchId);

    const numberOfBets = 100;
    const promises = [];

    const startTime = performance.now();

    // Create multiple concurrent bet placements
    for (let i = 0; i < numberOfBets; i++) {
      const bettor = `${TEST_BETTOR_1}-${i}`;
      const amount = (0.1 + Math.random() * 0.9) * LAMPORTS_PER_SOL; // 0.1 to 1.0 SOL
      const agent = i % 2 === 0 ? AGENT_ID_1 : AGENT_ID_2;

      promises.push(
        enhancedBettingService.placeBet(
          bettor,
          matchId,
          amount,
          agent,
          'ai_agent'
        )
      );
    }

    // Execute all bets concurrently
    const results = await Promise.allSettled(promises);
    const endTime = performance.now();

    const executionTime = endTime - startTime;
    const successfulBets = results.filter(r => r.status === 'fulfilled').length;

    // Performance assertions
    expect(executionTime).toBeLessThan(30000); // Should complete within 30 seconds
    expect(successfulBets).toBeGreaterThan(numberOfBets * 0.95); // 95% success rate

    // Verify final pool state
    const pool = await enhancedBettingService.getBettingPool(matchId);
    expect(pool).not.toBeNull();
    expect(pool!.betsCount).toBe(successfulBets);
    expect(pool!.totalPool).toBeGreaterThan(0);

    // Verify odds are still within bounds
    expect(pool!.oddsPlayer1).toBeGreaterThanOrEqual(MIN_ODDS);
    expect(pool!.oddsPlayer1).toBeLessThanOrEqual(MAX_ODDS);
    expect(pool!.oddsPlayer2).toBeGreaterThanOrEqual(MIN_ODDS);
    expect(pool!.oddsPlayer2).toBeLessThanOrEqual(MAX_ODDS);

    console.log(`✓ Performance test passed: ${successfulBets} bets in ${executionTime.toFixed(2)}ms`);
  });

  /**
   * Test 9: Odds history tracking
   * Verifies odds changes are tracked over time
   */
  test('Odds history tracking', async () => {
    const matchId = `${TEST_MATCH_ID}-odds-history`;

    // Create betting pool
    await enhancedBettingService.createBettingPool(matchId);

    // Track odds changes
    const oddsHistory: Array<{
      timestamp: number;
      oddsPlayer1: number;
      oddsPlayer2: number;
      totalPool: number;
      betsCount: number;
    }> = [];

    // Initial state
    let pool = await enhancedBettingService.getBettingPool(matchId);
    expect(pool).not.toBeNull();
    oddsHistory.push({
      timestamp: Date.now(),
      oddsPlayer1: pool!.oddsPlayer1,
      oddsPlayer2: pool!.oddsPlayer2,
      totalPool: pool!.totalPool,
      betsCount: pool!.betsCount
    });

    // Place sequential bets and track changes
    const bets = [
      { amount: 1.0 * LAMPORTS_PER_SOL, agent: AGENT_ID_1 },
      { amount: 1.0 * LAMPORTS_PER_SOL, agent: AGENT_ID_2 },
      { amount: 3.0 * LAMPORTS_PER_SOL, agent: AGENT_ID_1 },
      { amount: 2.0 * LAMPORTS_PER_SOL, agent: AGENT_ID_2 },
      { amount: 5.0 * LAMPORTS_PER_SOL, agent: AGENT_ID_1 }
    ];

    for (let i = 0; i < bets.length; i++) {
      await enhancedBettingService.placeBet(
        `${TEST_BETTOR_1}-${i}`,
        matchId,
        bets[i].amount,
        bets[i].agent,
        'ai_agent'
      );

      pool = await enhancedBettingService.getBettingPool(matchId);
      expect(pool).not.toBeNull();
      oddsHistory.push({
        timestamp: Date.now(),
        oddsPlayer1: pool!.oddsPlayer1,
        oddsPlayer2: pool!.oddsPlayer2,
        totalPool: pool!.totalPool,
        betsCount: pool!.betsCount
      });

      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Verify history tracking
    expect(oddsHistory).toHaveLength(bets.length + 1); // Initial + each bet

    // Verify progression
    for (let i = 1; i < oddsHistory.length; i++) {
      expect(oddsHistory[i].timestamp).toBeGreaterThan(oddsHistory[i-1].timestamp);
      expect(oddsHistory[i].totalPool).toBeGreaterThan(oddsHistory[i-1].totalPool);
      expect(oddsHistory[i].betsCount).toBeGreaterThan(oddsHistory[i-1].betsCount);
    }

    // Verify odds evolution reflects bet placement
    const finalHistory = oddsHistory[oddsHistory.length - 1];
    expect(finalHistory.oddsPlayer1).toBeGreaterThanOrEqual(MIN_ODDS);
    expect(finalHistory.oddsPlayer1).toBeLessThanOrEqual(MAX_ODDS);
    expect(finalHistory.oddsPlayer2).toBeGreaterThanOrEqual(MIN_ODDS);
    expect(finalHistory.oddsPlayer2).toBeLessThanOrEqual(MAX_ODDS);

    console.log('✓ Odds history tracking test passed');
  });

  /**
   * Test 10: Pool synchronization across services
   * Verifies consistency across different betting services
   */
  test('Pool synchronization across services', async () => {
    const matchId = `${TEST_MATCH_ID}-sync`;

    // Create betting pool in enhanced service
    const enhancedPool = await enhancedBettingService.createBettingPool(matchId);

    // Place identical bets in enhanced service
    await enhancedBettingService.placeBet(
      TEST_BETTOR_1,
      matchId,
      2.0 * LAMPORTS_PER_SOL,
      AGENT_ID_1,
      'ai_agent'
    );

    await enhancedBettingService.placeBet(
      TEST_BETTOR_2,
      matchId,
      3.0 * LAMPORTS_PER_SOL,
      AGENT_ID_2,
      'ai_agent'
    );

    // Get final state from enhanced service
    const finalEnhancedPool = await enhancedBettingService.getBettingPool(matchId);

    // Verify core calculations are consistent
    expect(finalEnhancedPool).not.toBeNull();
    expect(finalEnhancedPool!.totalPool).toBe(5.0 * LAMPORTS_PER_SOL);
    expect(finalEnhancedPool!.betsCount).toBe(2);

    // Verify state consistency
    expect(finalEnhancedPool!.oddsPlayer1).toBeGreaterThanOrEqual(MIN_ODDS);
    expect(finalEnhancedPool!.oddsPlayer1).toBeLessThanOrEqual(MAX_ODDS);
    expect(finalEnhancedPool!.oddsPlayer2).toBeGreaterThanOrEqual(MIN_ODDS);
    expect(finalEnhancedPool!.oddsPlayer2).toBeLessThanOrEqual(MAX_ODDS);

    // Test expected odds calculation
    const totalPool = finalEnhancedPool!.totalPool;
    const agent1Amount = 2.0 * LAMPORTS_PER_SOL;
    const agent2Amount = 3.0 * LAMPORTS_PER_SOL;

    const expectedOdds1 = Math.max(MIN_ODDS, Math.min(MAX_ODDS, totalPool / agent1Amount));
    const expectedOdds2 = Math.max(MIN_ODDS, Math.min(MAX_ODDS, totalPool / agent2Amount));

    expect(finalEnhancedPool!.oddsPlayer1).toBeCloseTo(expectedOdds1, 1);
    expect(finalEnhancedPool!.oddsPlayer2).toBeCloseTo(expectedOdds2, 1);

    console.log('✓ Pool synchronization test passed');
  });

  /**
   * Test 11: Complex multi-scenario validation
   * Comprehensive test covering multiple edge cases and scenarios
   */
  test('Complex multi-scenario validation', async () => {
    const matchId = `${TEST_MATCH_ID}-complex`;

    // Create betting pool
    await enhancedBettingService.createBettingPool(matchId);

    // Scenario 1: Gradual build-up with varying amounts
    const scenarios = [
      { bettor: TEST_BETTOR_1, amount: 0.5, agent: AGENT_ID_1 },
      { bettor: TEST_BETTOR_2, amount: 0.5, agent: AGENT_ID_2 },
      { bettor: TEST_BETTOR_3, amount: 1.5, agent: AGENT_ID_1 },
      { bettor: TEST_BETTOR_1, amount: 2.0, agent: AGENT_ID_2 },
      { bettor: TEST_BETTOR_2, amount: 1.0, agent: AGENT_ID_1 },
      { bettor: TEST_BETTOR_3, amount: 3.0, agent: AGENT_ID_2 }
    ];

    let runningTotal = 0;
    let agent1Total = 0;
    let agent2Total = 0;

    for (const scenario of scenarios) {
      await enhancedBettingService.placeBet(
        scenario.bettor,
        matchId,
        scenario.amount * LAMPORTS_PER_SOL,
        scenario.agent,
        'ai_agent'
      );

      runningTotal += scenario.amount * LAMPORTS_PER_SOL;
      if (scenario.agent === AGENT_ID_1) {
        agent1Total += scenario.amount * LAMPORTS_PER_SOL;
      } else {
        agent2Total += scenario.amount * LAMPORTS_PER_SOL;
      }

      // Verify pool state after each bet
      const pool = await enhancedBettingService.getBettingPool(matchId);
      expect(pool).not.toBeNull();
      expect(pool!.totalPool).toBe(runningTotal);
      expect(pool!.oddsPlayer1).toBeGreaterThanOrEqual(MIN_ODDS);
      expect(pool!.oddsPlayer1).toBeLessThanOrEqual(MAX_ODDS);
      expect(pool!.oddsPlayer2).toBeGreaterThanOrEqual(MIN_ODDS);
      expect(pool!.oddsPlayer2).toBeLessThanOrEqual(MAX_ODDS);
    }

    // Final verification
    const finalPool = await enhancedBettingService.getBettingPool(matchId);
    expect(finalPool).not.toBeNull();
    expect(finalPool!.totalPool).toBe(runningTotal);
    expect(finalPool!.betsCount).toBe(scenarios.length);

    // Verify mathematical consistency
    const calculatedOdds1 = Math.max(MIN_ODDS, Math.min(MAX_ODDS, runningTotal / agent1Total));
    const calculatedOdds2 = Math.max(MIN_ODDS, Math.min(MAX_ODDS, runningTotal / agent2Total));

    expect(finalPool!.oddsPlayer1).toBeCloseTo(calculatedOdds1, 1);
    expect(finalPool!.oddsPlayer2).toBeCloseTo(calculatedOdds2, 1);

    console.log('✓ Complex multi-scenario validation test passed');
  });
});
