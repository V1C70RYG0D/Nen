"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EnhancedBettingService_1 = require("../../services/EnhancedBettingService");
const web3_js_1 = require("@solana/web3.js");
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
    let enhancedBettingService;
    const TEST_MATCH_ID = 'odds-test-match-456';
    const TEST_BETTOR_1 = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
    const TEST_BETTOR_2 = 'DjVE6JNiYqPL2QXyCUEwmm2gMLamMK5kZvhZrHTL1FaD';
    const TEST_BETTOR_3 = 'H6ARHf6YXhGYeQfUzQNGMGAANqULSgk8z8hbhk9a2Ciq';
    const AGENT_ID_1 = 'royal_guard_alpha';
    const AGENT_ID_2 = 'knight_defender_beta';
    const INITIAL_ODDS = 2.0;
    const MAX_ODDS = 10.0;
    const MIN_ODDS = 1.1;
    const STANDARD_BET_AMOUNT = 1.0 * web3_js_1.LAMPORTS_PER_SOL;
    const LARGE_BET_AMOUNT = 10.0 * web3_js_1.LAMPORTS_PER_SOL;
    const SMALL_BET_AMOUNT = 0.1 * web3_js_1.LAMPORTS_PER_SOL;
    beforeAll(async () => {
        enhancedBettingService = new EnhancedBettingService_1.EnhancedBettingService();
        process.env.MIN_BET_LAMPORTS = (0.01 * web3_js_1.LAMPORTS_PER_SOL).toString();
        process.env.MAX_BET_LAMPORTS = (100 * web3_js_1.LAMPORTS_PER_SOL).toString();
        process.env.PLATFORM_FEE_BPS = '250';
        process.env.TREASURY_WALLET = 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS';
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    test('Initial odds calculation (2.0 default)', async () => {
        const pool = await enhancedBettingService.createBettingPool(TEST_MATCH_ID);
        expect(pool.oddsPlayer1).toBe(INITIAL_ODDS);
        expect(pool.oddsPlayer2).toBe(INITIAL_ODDS);
        expect(pool.totalPool).toBe(0);
        expect(pool.betsCount).toBe(0);
        expect(pool.isActive).toBe(true);
        expect(pool.matchId).toBe(TEST_MATCH_ID);
        expect(pool.bets).toEqual([]);
        expect(pool.complianceStatus).toBeDefined();
        expect(pool.riskLevel).toBeDefined();
        console.log('✓ Initial odds calculation test passed');
    });
    test('Odds updates with new bets', async () => {
        const matchId = `${TEST_MATCH_ID}-odds-updates`;
        await enhancedBettingService.createBettingPool(matchId);
        const bet1 = await enhancedBettingService.placeBet(TEST_BETTOR_1, matchId, STANDARD_BET_AMOUNT, AGENT_ID_1, 'ai_agent');
        let pool = await enhancedBettingService.getBettingPool(matchId);
        expect(pool).not.toBeNull();
        expect(pool.totalPool).toBe(STANDARD_BET_AMOUNT);
        expect(pool.betsCount).toBe(1);
        const bet2 = await enhancedBettingService.placeBet(TEST_BETTOR_2, matchId, STANDARD_BET_AMOUNT, AGENT_ID_2, 'ai_agent');
        pool = await enhancedBettingService.getBettingPool(matchId);
        expect(pool).not.toBeNull();
        expect(pool.totalPool).toBe(STANDARD_BET_AMOUNT * 2);
        expect(pool.betsCount).toBe(2);
        expect(pool.oddsPlayer1).toBeCloseTo(2.0, 1);
        expect(pool.oddsPlayer2).toBeCloseTo(2.0, 1);
        const bet3 = await enhancedBettingService.placeBet(TEST_BETTOR_3, matchId, LARGE_BET_AMOUNT, AGENT_ID_1, 'ai_agent');
        pool = await enhancedBettingService.getBettingPool(matchId);
        expect(pool).not.toBeNull();
        expect(pool.totalPool).toBe(STANDARD_BET_AMOUNT * 2 + LARGE_BET_AMOUNT);
        const totalOnAgent1 = STANDARD_BET_AMOUNT + LARGE_BET_AMOUNT;
        const totalOnAgent2 = STANDARD_BET_AMOUNT;
        const expectedOddsAgent1 = Math.max(MIN_ODDS, pool.totalPool / totalOnAgent1);
        const expectedOddsAgent2 = Math.max(MIN_ODDS, pool.totalPool / totalOnAgent2);
        expect(pool.oddsPlayer1).toBeCloseTo(expectedOddsAgent1, 1);
        expect(pool.oddsPlayer2).toBeCloseTo(expectedOddsAgent2, 1);
        expect(pool.oddsPlayer1).toBeLessThan(pool.oddsPlayer2);
        console.log('✓ Odds updates with new bets test passed');
    });
    test('Pool distribution tracking', async () => {
        const matchId = `${TEST_MATCH_ID}-pool-distribution`;
        await enhancedBettingService.createBettingPool(matchId);
        const betAmounts = {
            [AGENT_ID_1]: [],
            [AGENT_ID_2]: []
        };
        const bets = [
            { bettor: TEST_BETTOR_1, amount: 1.0 * web3_js_1.LAMPORTS_PER_SOL, agent: AGENT_ID_1 },
            { bettor: TEST_BETTOR_2, amount: 2.0 * web3_js_1.LAMPORTS_PER_SOL, agent: AGENT_ID_2 },
            { bettor: TEST_BETTOR_3, amount: 0.5 * web3_js_1.LAMPORTS_PER_SOL, agent: AGENT_ID_1 },
            { bettor: TEST_BETTOR_1, amount: 3.0 * web3_js_1.LAMPORTS_PER_SOL, agent: AGENT_ID_2 },
            { bettor: TEST_BETTOR_2, amount: 1.5 * web3_js_1.LAMPORTS_PER_SOL, agent: AGENT_ID_1 }
        ];
        for (const bet of bets) {
            await enhancedBettingService.placeBet(bet.bettor, matchId, bet.amount, bet.agent, 'ai_agent');
            betAmounts[bet.agent].push(bet.amount);
        }
        const totalOnAgent1 = betAmounts[AGENT_ID_1].reduce((sum, amount) => sum + amount, 0);
        const totalOnAgent2 = betAmounts[AGENT_ID_2].reduce((sum, amount) => sum + amount, 0);
        const expectedTotalPool = totalOnAgent1 + totalOnAgent2;
        const pool = await enhancedBettingService.getBettingPool(matchId);
        expect(pool).not.toBeNull();
        expect(pool.totalPool).toBe(expectedTotalPool);
        expect(pool.betsCount).toBe(bets.length);
        const agent1Bets = pool.bets.filter(bet => bet.predictedWinner === AGENT_ID_1);
        const agent2Bets = pool.bets.filter(bet => bet.predictedWinner === AGENT_ID_2);
        const actualTotalOnAgent1 = agent1Bets.reduce((sum, bet) => sum + bet.amount, 0);
        const actualTotalOnAgent2 = agent2Bets.reduce((sum, bet) => sum + bet.amount, 0);
        expect(actualTotalOnAgent1).toBe(totalOnAgent1);
        expect(actualTotalOnAgent2).toBe(totalOnAgent2);
        const agent1Proportion = totalOnAgent1 / expectedTotalPool;
        const agent2Proportion = totalOnAgent2 / expectedTotalPool;
        expect(agent1Proportion + agent2Proportion).toBeCloseTo(1.0, 5);
        if (totalOnAgent1 > totalOnAgent2) {
            expect(pool.oddsPlayer1).toBeLessThan(pool.oddsPlayer2);
        }
        else if (totalOnAgent2 > totalOnAgent1) {
            expect(pool.oddsPlayer2).toBeLessThan(pool.oddsPlayer1);
        }
        console.log('✓ Pool distribution tracking test passed');
    });
    test('Maximum odds capping (10.0)', async () => {
        const matchId = `${TEST_MATCH_ID}-max-odds-capping`;
        await enhancedBettingService.createBettingPool(matchId);
        await enhancedBettingService.placeBet(TEST_BETTOR_1, matchId, SMALL_BET_AMOUNT, AGENT_ID_1, 'ai_agent');
        await enhancedBettingService.placeBet(TEST_BETTOR_2, matchId, 50 * web3_js_1.LAMPORTS_PER_SOL, AGENT_ID_2, 'ai_agent');
        const pool = await enhancedBettingService.getBettingPool(matchId);
        expect(pool).not.toBeNull();
        expect(pool.oddsPlayer1).toBeLessThanOrEqual(MAX_ODDS);
        expect(pool.oddsPlayer2).toBeLessThanOrEqual(MAX_ODDS);
        expect(pool.oddsPlayer1).toBeCloseTo(MAX_ODDS, 1);
        expect(pool.oddsPlayer2).toBeLessThan(2.0);
        console.log('✓ Maximum odds capping test passed');
    });
    test('Minimum odds floor (1.1)', async () => {
        const matchId = `${TEST_MATCH_ID}-min-odds-floor`;
        await enhancedBettingService.createBettingPool(matchId);
        await enhancedBettingService.placeBet(TEST_BETTOR_1, matchId, 75 * web3_js_1.LAMPORTS_PER_SOL, AGENT_ID_1, 'ai_agent');
        await enhancedBettingService.placeBet(TEST_BETTOR_2, matchId, SMALL_BET_AMOUNT, AGENT_ID_2, 'ai_agent');
        const pool = await enhancedBettingService.getBettingPool(matchId);
        expect(pool).not.toBeNull();
        expect(pool.oddsPlayer1).toBeGreaterThanOrEqual(MIN_ODDS);
        expect(pool.oddsPlayer2).toBeGreaterThanOrEqual(MIN_ODDS);
        expect(pool.oddsPlayer1).toBeCloseTo(MIN_ODDS, 1);
        expect(pool.oddsPlayer2).toBeGreaterThan(5.0);
        console.log('✓ Minimum odds floor test passed');
    });
    test('Edge case handling (zero pools)', async () => {
        const matchId = `${TEST_MATCH_ID}-edge-cases`;
        const emptyPool = await enhancedBettingService.createBettingPool(matchId);
        expect(emptyPool.oddsPlayer1).toBe(INITIAL_ODDS);
        expect(emptyPool.oddsPlayer2).toBe(INITIAL_ODDS);
        expect(emptyPool.totalPool).toBe(0);
        await enhancedBettingService.placeBet(TEST_BETTOR_1, matchId, STANDARD_BET_AMOUNT, AGENT_ID_1, 'ai_agent');
        let pool = await enhancedBettingService.getBettingPool(matchId);
        expect(pool).not.toBeNull();
        expect(pool.totalPool).toBe(STANDARD_BET_AMOUNT);
        expect(pool.betsCount).toBe(1);
        expect(pool.oddsPlayer1).toBeGreaterThanOrEqual(MIN_ODDS);
        expect(pool.oddsPlayer2).toBe(INITIAL_ODDS);
        const tinyMatchId = `${matchId}-tiny`;
        await enhancedBettingService.createBettingPool(tinyMatchId);
        const minimumAmount = 1;
        await enhancedBettingService.placeBet(TEST_BETTOR_1, tinyMatchId, minimumAmount, AGENT_ID_1, 'ai_agent');
        const tinyPool = await enhancedBettingService.getBettingPool(tinyMatchId);
        expect(tinyPool).not.toBeNull();
        expect(tinyPool.totalPool).toBe(minimumAmount);
        expect(tinyPool.oddsPlayer1).toBeGreaterThanOrEqual(MIN_ODDS);
        expect(tinyPool.oddsPlayer1).toBeLessThanOrEqual(MAX_ODDS);
        const maxMatchId = `${matchId}-max`;
        await enhancedBettingService.createBettingPool(maxMatchId);
        const maxAmount = 99 * web3_js_1.LAMPORTS_PER_SOL;
        await enhancedBettingService.placeBet(TEST_BETTOR_1, maxMatchId, maxAmount, AGENT_ID_1, 'ai_agent');
        const maxPool = await enhancedBettingService.getBettingPool(maxMatchId);
        expect(maxPool).not.toBeNull();
        expect(maxPool.totalPool).toBe(maxAmount);
        expect(maxPool.oddsPlayer1).toBeGreaterThanOrEqual(MIN_ODDS);
        expect(maxPool.oddsPlayer1).toBeLessThanOrEqual(MAX_ODDS);
        console.log('✓ Edge case handling test passed');
    });
    test('Mathematical accuracy of calculations', async () => {
        const matchId = `${TEST_MATCH_ID}-math-accuracy`;
        await enhancedBettingService.createBettingPool(matchId);
        const betAmount1 = 3.33333 * web3_js_1.LAMPORTS_PER_SOL;
        const betAmount2 = 6.66667 * web3_js_1.LAMPORTS_PER_SOL;
        await enhancedBettingService.placeBet(TEST_BETTOR_1, matchId, betAmount1, AGENT_ID_1, 'ai_agent');
        await enhancedBettingService.placeBet(TEST_BETTOR_2, matchId, betAmount2, AGENT_ID_2, 'ai_agent');
        const pool = await enhancedBettingService.getBettingPool(matchId);
        const totalPool = betAmount1 + betAmount2;
        const proportion1 = betAmount1 / totalPool;
        const proportion2 = betAmount2 / totalPool;
        const expectedOdds1 = Math.max(MIN_ODDS, 1 / proportion1);
        const expectedOdds2 = Math.max(MIN_ODDS, 1 / proportion2);
        expect(pool).not.toBeNull();
        expect(pool.oddsPlayer1).toBeCloseTo(expectedOdds1, 2);
        expect(pool.oddsPlayer2).toBeCloseTo(expectedOdds2, 2);
        expect(proportion1 + proportion2).toBeCloseTo(1.0, 5);
        expect(pool.totalPool).toBe(totalPool);
        expect(Number(pool.oddsPlayer1.toFixed(2))).toBe(pool.oddsPlayer1);
        expect(Number(pool.oddsPlayer2.toFixed(2))).toBe(pool.oddsPlayer2);
        console.log('✓ Mathematical accuracy test passed');
    });
    test('Performance with large bet volumes', async () => {
        const matchId = `${TEST_MATCH_ID}-performance`;
        await enhancedBettingService.createBettingPool(matchId);
        const numberOfBets = 100;
        const promises = [];
        const startTime = performance.now();
        for (let i = 0; i < numberOfBets; i++) {
            const bettor = `${TEST_BETTOR_1}-${i}`;
            const amount = (0.1 + Math.random() * 0.9) * web3_js_1.LAMPORTS_PER_SOL;
            const agent = i % 2 === 0 ? AGENT_ID_1 : AGENT_ID_2;
            promises.push(enhancedBettingService.placeBet(bettor, matchId, amount, agent, 'ai_agent'));
        }
        const results = await Promise.allSettled(promises);
        const endTime = performance.now();
        const executionTime = endTime - startTime;
        const successfulBets = results.filter(r => r.status === 'fulfilled').length;
        expect(executionTime).toBeLessThan(30000);
        expect(successfulBets).toBeGreaterThan(numberOfBets * 0.95);
        const pool = await enhancedBettingService.getBettingPool(matchId);
        expect(pool).not.toBeNull();
        expect(pool.betsCount).toBe(successfulBets);
        expect(pool.totalPool).toBeGreaterThan(0);
        expect(pool.oddsPlayer1).toBeGreaterThanOrEqual(MIN_ODDS);
        expect(pool.oddsPlayer1).toBeLessThanOrEqual(MAX_ODDS);
        expect(pool.oddsPlayer2).toBeGreaterThanOrEqual(MIN_ODDS);
        expect(pool.oddsPlayer2).toBeLessThanOrEqual(MAX_ODDS);
        console.log(`✓ Performance test passed: ${successfulBets} bets in ${executionTime.toFixed(2)}ms`);
    });
    test('Odds history tracking', async () => {
        const matchId = `${TEST_MATCH_ID}-odds-history`;
        await enhancedBettingService.createBettingPool(matchId);
        const oddsHistory = [];
        let pool = await enhancedBettingService.getBettingPool(matchId);
        expect(pool).not.toBeNull();
        oddsHistory.push({
            timestamp: Date.now(),
            oddsPlayer1: pool.oddsPlayer1,
            oddsPlayer2: pool.oddsPlayer2,
            totalPool: pool.totalPool,
            betsCount: pool.betsCount
        });
        const bets = [
            { amount: 1.0 * web3_js_1.LAMPORTS_PER_SOL, agent: AGENT_ID_1 },
            { amount: 1.0 * web3_js_1.LAMPORTS_PER_SOL, agent: AGENT_ID_2 },
            { amount: 3.0 * web3_js_1.LAMPORTS_PER_SOL, agent: AGENT_ID_1 },
            { amount: 2.0 * web3_js_1.LAMPORTS_PER_SOL, agent: AGENT_ID_2 },
            { amount: 5.0 * web3_js_1.LAMPORTS_PER_SOL, agent: AGENT_ID_1 }
        ];
        for (let i = 0; i < bets.length; i++) {
            await enhancedBettingService.placeBet(`${TEST_BETTOR_1}-${i}`, matchId, bets[i].amount, bets[i].agent, 'ai_agent');
            pool = await enhancedBettingService.getBettingPool(matchId);
            expect(pool).not.toBeNull();
            oddsHistory.push({
                timestamp: Date.now(),
                oddsPlayer1: pool.oddsPlayer1,
                oddsPlayer2: pool.oddsPlayer2,
                totalPool: pool.totalPool,
                betsCount: pool.betsCount
            });
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        expect(oddsHistory).toHaveLength(bets.length + 1);
        for (let i = 1; i < oddsHistory.length; i++) {
            expect(oddsHistory[i].timestamp).toBeGreaterThan(oddsHistory[i - 1].timestamp);
            expect(oddsHistory[i].totalPool).toBeGreaterThan(oddsHistory[i - 1].totalPool);
            expect(oddsHistory[i].betsCount).toBeGreaterThan(oddsHistory[i - 1].betsCount);
        }
        const finalHistory = oddsHistory[oddsHistory.length - 1];
        expect(finalHistory.oddsPlayer1).toBeGreaterThanOrEqual(MIN_ODDS);
        expect(finalHistory.oddsPlayer1).toBeLessThanOrEqual(MAX_ODDS);
        expect(finalHistory.oddsPlayer2).toBeGreaterThanOrEqual(MIN_ODDS);
        expect(finalHistory.oddsPlayer2).toBeLessThanOrEqual(MAX_ODDS);
        console.log('✓ Odds history tracking test passed');
    });
    test('Pool synchronization across services', async () => {
        const matchId = `${TEST_MATCH_ID}-sync`;
        const enhancedPool = await enhancedBettingService.createBettingPool(matchId);
        await enhancedBettingService.placeBet(TEST_BETTOR_1, matchId, 2.0 * web3_js_1.LAMPORTS_PER_SOL, AGENT_ID_1, 'ai_agent');
        await enhancedBettingService.placeBet(TEST_BETTOR_2, matchId, 3.0 * web3_js_1.LAMPORTS_PER_SOL, AGENT_ID_2, 'ai_agent');
        const finalEnhancedPool = await enhancedBettingService.getBettingPool(matchId);
        expect(finalEnhancedPool).not.toBeNull();
        expect(finalEnhancedPool.totalPool).toBe(5.0 * web3_js_1.LAMPORTS_PER_SOL);
        expect(finalEnhancedPool.betsCount).toBe(2);
        expect(finalEnhancedPool.oddsPlayer1).toBeGreaterThanOrEqual(MIN_ODDS);
        expect(finalEnhancedPool.oddsPlayer1).toBeLessThanOrEqual(MAX_ODDS);
        expect(finalEnhancedPool.oddsPlayer2).toBeGreaterThanOrEqual(MIN_ODDS);
        expect(finalEnhancedPool.oddsPlayer2).toBeLessThanOrEqual(MAX_ODDS);
        const totalPool = finalEnhancedPool.totalPool;
        const agent1Amount = 2.0 * web3_js_1.LAMPORTS_PER_SOL;
        const agent2Amount = 3.0 * web3_js_1.LAMPORTS_PER_SOL;
        const expectedOdds1 = Math.max(MIN_ODDS, Math.min(MAX_ODDS, totalPool / agent1Amount));
        const expectedOdds2 = Math.max(MIN_ODDS, Math.min(MAX_ODDS, totalPool / agent2Amount));
        expect(finalEnhancedPool.oddsPlayer1).toBeCloseTo(expectedOdds1, 1);
        expect(finalEnhancedPool.oddsPlayer2).toBeCloseTo(expectedOdds2, 1);
        console.log('✓ Pool synchronization test passed');
    });
    test('Complex multi-scenario validation', async () => {
        const matchId = `${TEST_MATCH_ID}-complex`;
        await enhancedBettingService.createBettingPool(matchId);
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
            await enhancedBettingService.placeBet(scenario.bettor, matchId, scenario.amount * web3_js_1.LAMPORTS_PER_SOL, scenario.agent, 'ai_agent');
            runningTotal += scenario.amount * web3_js_1.LAMPORTS_PER_SOL;
            if (scenario.agent === AGENT_ID_1) {
                agent1Total += scenario.amount * web3_js_1.LAMPORTS_PER_SOL;
            }
            else {
                agent2Total += scenario.amount * web3_js_1.LAMPORTS_PER_SOL;
            }
            const pool = await enhancedBettingService.getBettingPool(matchId);
            expect(pool).not.toBeNull();
            expect(pool.totalPool).toBe(runningTotal);
            expect(pool.oddsPlayer1).toBeGreaterThanOrEqual(MIN_ODDS);
            expect(pool.oddsPlayer1).toBeLessThanOrEqual(MAX_ODDS);
            expect(pool.oddsPlayer2).toBeGreaterThanOrEqual(MIN_ODDS);
            expect(pool.oddsPlayer2).toBeLessThanOrEqual(MAX_ODDS);
        }
        const finalPool = await enhancedBettingService.getBettingPool(matchId);
        expect(finalPool).not.toBeNull();
        expect(finalPool.totalPool).toBe(runningTotal);
        expect(finalPool.betsCount).toBe(scenarios.length);
        const calculatedOdds1 = Math.max(MIN_ODDS, Math.min(MAX_ODDS, runningTotal / agent1Total));
        const calculatedOdds2 = Math.max(MIN_ODDS, Math.min(MAX_ODDS, runningTotal / agent2Total));
        expect(finalPool.oddsPlayer1).toBeCloseTo(calculatedOdds1, 1);
        expect(finalPool.oddsPlayer2).toBeCloseTo(calculatedOdds2, 1);
        console.log('✓ Complex multi-scenario validation test passed');
    });
});
//# sourceMappingURL=odds-calculation-working.test.js.map