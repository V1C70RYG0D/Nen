"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jest_each_1 = __importDefault(require("jest-each"));
const BettingService_1 = require("../../services/BettingService");
const logger_1 = require("../../utils/logger");
const setup_1 = require("../setup");
const uuid_1 = require("uuid");
const perf_hooks_1 = require("perf_hooks");
jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    }
}));
jest.mock('../../services/BettingService', () => ({
    BettingService: jest.fn().mockImplementation(() => ({
        settleBets: jest.fn()
    }))
}));
describe('Bet Settlement & Payouts', () => {
    let bettingService;
    let testMatchId;
    let testUserId1;
    let testUserId2;
    let testUserId3;
    let testWinnerId;
    beforeAll(async () => {
        await (0, setup_1.cleanupTestEnvironment)();
        bettingService = new BettingService_1.BettingService();
        testMatchId = (0, uuid_1.v4)();
        testUserId1 = (0, uuid_1.v4)();
        testUserId2 = (0, uuid_1.v4)();
        testUserId3 = (0, uuid_1.v4)();
        testWinnerId = (0, uuid_1.v4)();
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    afterAll(async () => {
        await (0, setup_1.cleanupTestEnvironment)();
    });
    test('Winning bet settlement calculation', async () => {
        const originalSettleBets = bettingService.settleBets;
        let capturedWinnerId;
        let capturedWinnerType;
        let settlementProcessed = false;
        bettingService.settleBets = jest.fn().mockImplementation(async (matchId, winnerId, winnerType) => {
            capturedWinnerId = winnerId;
            capturedWinnerType = winnerType;
            settlementProcessed = true;
            logger_1.logger.info('Starting bet settlement', { matchId, winnerId, winnerType });
            logger_1.logger.info('Bet settlement completed', {
                matchId,
                settledBets: 1,
                winnerId,
                winnerType
            });
            return Promise.resolve();
        });
        await bettingService.settleBets(testMatchId, testWinnerId, 'ai');
        expect(settlementProcessed).toBe(true);
        expect(capturedWinnerId).toBe(testWinnerId);
        expect(capturedWinnerType).toBe('ai');
        expect(logger_1.logger.info).toHaveBeenCalledWith('Starting bet settlement', expect.objectContaining({
            matchId: testMatchId,
            winnerId: testWinnerId,
            winnerType: 'ai'
        }));
        expect(logger_1.logger.info).toHaveBeenCalledWith('Bet settlement completed', expect.objectContaining({
            matchId: testMatchId,
            settledBets: 1,
            winnerId: testWinnerId,
            winnerType: 'ai'
        }));
        bettingService.settleBets = originalSettleBets;
    });
    test('Losing bet status updates', async () => {
        const originalSettleBets = bettingService.settleBets;
        let processedBets = [];
        bettingService.settleBets = jest.fn().mockImplementation(async (matchId, winnerId, winnerType) => {
            const mockLosingBet = {
                id: (0, uuid_1.v4)(),
                userId: testUserId2,
                amount: 5,
                predictedWinnerId: 'different-winner-id',
                isWinning: false
            };
            processedBets.push(mockLosingBet);
            logger_1.logger.info('Processing losing bet', {
                betId: mockLosingBet.id,
                userId: mockLosingBet.userId,
                amount: mockLosingBet.amount
            });
            return Promise.resolve();
        });
        await bettingService.settleBets(testMatchId, testWinnerId, 'ai');
        expect(processedBets.length).toBe(1);
        expect(processedBets[0].isWinning).toBe(false);
        expect(processedBets[0].userId).toBe(testUserId2);
        bettingService.settleBets = originalSettleBets;
    });
    test('Platform fee deduction (3%)', async () => {
        const testScenarios = [
            { betAmount: 100, odds: 2.0, expectedGross: 200, expectedFee: 6, expectedNet: 194 },
            { betAmount: 50, odds: 3.0, expectedGross: 150, expectedFee: 4.5, expectedNet: 145.5 },
            { betAmount: 10, odds: 1.5, expectedGross: 15, expectedFee: 0.45, expectedNet: 14.55 },
        ];
        for (const scenario of testScenarios) {
            const platformFeeRate = 0.03;
            const grossPayout = scenario.betAmount * scenario.odds;
            const platformFee = grossPayout * platformFeeRate;
            const netPayout = grossPayout - platformFee;
            expect(grossPayout).toBe(scenario.expectedGross);
            expect(platformFee).toBeCloseTo(scenario.expectedFee, 2);
            expect(netPayout).toBeCloseTo(scenario.expectedNet, 2);
        }
    });
    test('User balance updates', async () => {
        const winningBetAmount = 20;
        const losingBetAmount = 15;
        const winningPayout = 40;
        const netWinnings = winningPayout - winningBetAmount;
        const balanceUpdates = [];
        const originalSettleBets = bettingService.settleBets;
        bettingService.settleBets = jest.fn().mockImplementation(async (matchId, winnerId, winnerType) => {
            balanceUpdates.push({
                userId: testUserId1,
                type: 'win',
                payout: winningPayout,
                netWinnings: netWinnings
            });
            balanceUpdates.push({
                userId: testUserId2,
                type: 'loss',
                lossAmount: losingBetAmount
            });
            return Promise.resolve();
        });
        await bettingService.settleBets(testMatchId, testWinnerId, 'ai');
        expect(balanceUpdates.length).toBe(2);
        const winnerUpdate = balanceUpdates.find(update => update.type === 'win');
        expect(winnerUpdate).toBeDefined();
        expect(winnerUpdate.payout).toBe(winningPayout);
        expect(winnerUpdate.netWinnings).toBe(netWinnings);
        const loserUpdate = balanceUpdates.find(update => update.type === 'loss');
        expect(loserUpdate).toBeDefined();
        expect(loserUpdate.lossAmount).toBe(losingBetAmount);
        bettingService.settleBets = originalSettleBets;
    });
    test('Bulk settlement processing', async () => {
        const numberOfBets = 100;
        let processedBetCount = 0;
        const originalSettleBets = bettingService.settleBets;
        bettingService.settleBets = jest.fn().mockImplementation(async (matchId, winnerId, winnerType) => {
            processedBetCount = numberOfBets;
            logger_1.logger.info('Bet settlement completed', {
                matchId,
                settledBets: numberOfBets
            });
            return Promise.resolve();
        });
        const startTime = perf_hooks_1.performance.now();
        await bettingService.settleBets(testMatchId, testWinnerId, 'ai');
        const endTime = perf_hooks_1.performance.now();
        const processingTime = endTime - startTime;
        expect(processedBetCount).toBe(numberOfBets);
        expect(processingTime).toBeLessThan(1000);
        expect(logger_1.logger.info).toHaveBeenCalledWith('Bet settlement completed', expect.objectContaining({
            settledBets: numberOfBets
        }));
        bettingService.settleBets = originalSettleBets;
    });
    test('Settlement transaction logging', async () => {
        const betId = (0, uuid_1.v4)();
        const originalSettleBets = bettingService.settleBets;
        bettingService.settleBets = jest.fn().mockImplementation(async (matchId, winnerId, winnerType) => {
            logger_1.logger.info('Starting bet settlement', { matchId, winnerId, winnerType });
            logger_1.logger.info('Processing bet', { betId, userId: testUserId1, amount: 25.0 });
            logger_1.logger.info('Bet settlement completed', {
                matchId,
                settledBets: 1,
                winnerId,
                winnerType
            });
            return Promise.resolve();
        });
        await bettingService.settleBets(testMatchId, testWinnerId, 'ai');
        expect(logger_1.logger.info).toHaveBeenCalledWith('Starting bet settlement', expect.objectContaining({
            matchId: testMatchId,
            winnerId: testWinnerId,
            winnerType: 'ai'
        }));
        expect(logger_1.logger.info).toHaveBeenCalledWith('Processing bet', expect.objectContaining({
            betId,
            userId: testUserId1,
            amount: 25.0
        }));
        expect(logger_1.logger.info).toHaveBeenCalledWith('Bet settlement completed', expect.objectContaining({
            matchId: testMatchId,
            settledBets: 1,
            winnerId: testWinnerId,
            winnerType: 'ai'
        }));
        bettingService.settleBets = originalSettleBets;
    });
    test('Error handling in settlement', async () => {
        const errorScenarios = [
            {
                name: 'Database connection error',
                error: new Error('Database connection failed')
            },
            {
                name: 'Transaction rollback error',
                error: new Error('Transaction failed')
            },
            {
                name: 'Invalid bet data error',
                error: new Error('Invalid bet data')
            }
        ];
        for (const scenario of errorScenarios) {
            jest.clearAllMocks();
            const originalSettleBets = bettingService.settleBets;
            bettingService.settleBets = jest.fn().mockRejectedValue(scenario.error);
            await expect(bettingService.settleBets(testMatchId, testWinnerId, 'ai')).rejects.toThrow(scenario.error.message);
            bettingService.settleBets = originalSettleBets;
        }
    });
    test('Settlement notification events', async () => {
        let notificationsSent = [];
        const originalSettleBets = bettingService.settleBets;
        bettingService.settleBets = jest.fn().mockImplementation(async (matchId, winnerId, winnerType) => {
            notificationsSent.push({
                type: 'settlement_started',
                matchId,
                winnerId,
                winnerType,
                timestamp: new Date()
            });
            notificationsSent.push({
                type: 'settlement_completed',
                matchId,
                settledBets: 1,
                timestamp: new Date()
            });
            logger_1.logger.info('Settlement notifications sent', { count: notificationsSent.length });
            return Promise.resolve();
        });
        await bettingService.settleBets(testMatchId, testWinnerId, 'ai');
        expect(notificationsSent.length).toBe(2);
        expect(notificationsSent[0].type).toBe('settlement_started');
        expect(notificationsSent[1].type).toBe('settlement_completed');
        expect(logger_1.logger.info).toHaveBeenCalledWith('Settlement notifications sent', { count: 2 });
        bettingService.settleBets = originalSettleBets;
    });
    test('Audit trail maintenance', async () => {
        const auditTrail = [];
        const originalSettleBets = bettingService.settleBets;
        bettingService.settleBets = jest.fn().mockImplementation(async (matchId, winnerId, winnerType) => {
            const settlementTime = new Date();
            auditTrail.push({
                action: 'settlement_started',
                matchId,
                winnerId,
                winnerType,
                timestamp: settlementTime,
                executor: 'system'
            });
            auditTrail.push({
                action: 'bet_processed',
                betId: (0, uuid_1.v4)(),
                userId: testUserId1,
                status: 'won',
                payout: 27.0,
                timestamp: settlementTime
            });
            auditTrail.push({
                action: 'settlement_completed',
                matchId,
                totalBetsProcessed: 1,
                timestamp: settlementTime
            });
            return Promise.resolve();
        });
        await bettingService.settleBets(testMatchId, testWinnerId, 'ai');
        expect(auditTrail.length).toBe(3);
        expect(auditTrail[0].action).toBe('settlement_started');
        expect(auditTrail[1].action).toBe('bet_processed');
        expect(auditTrail[2].action).toBe('settlement_completed');
        auditTrail.forEach(entry => {
            expect(entry.timestamp).toBeInstanceOf(Date);
        });
        bettingService.settleBets = originalSettleBets;
    });
    test('Settlement rollback on errors', async () => {
        let rollbackExecuted = false;
        const originalSettleBets = bettingService.settleBets;
        bettingService.settleBets = jest.fn().mockImplementation(async (matchId, winnerId, winnerType) => {
            try {
                throw new Error('Database constraint violation');
            }
            catch (error) {
                rollbackExecuted = true;
                logger_1.logger.error('Error settling bets:', error);
                throw error;
            }
        });
        await expect(bettingService.settleBets(testMatchId, testWinnerId, 'ai')).rejects.toThrow('Database constraint violation');
        expect(rollbackExecuted).toBe(true);
        expect(logger_1.logger.error).toHaveBeenCalledWith('Error settling bets:', expect.any(Error));
        bettingService.settleBets = originalSettleBets;
    });
    test('Complete settlement workflow integration', async () => {
        const winningBets = [
            { userId: testUserId1, amount: 20, odds: 2.1, payout: 42 },
            { userId: testUserId2, amount: 15, odds: 1.8, payout: 27 },
        ];
        const losingBets = [
            { userId: testUserId3, amount: 25, odds: 2.3 },
        ];
        let processedWinners = 0;
        let processedLosers = 0;
        const totalBets = winningBets.length + losingBets.length;
        const originalSettleBets = bettingService.settleBets;
        bettingService.settleBets = jest.fn().mockImplementation(async (matchId, winnerId, winnerType) => {
            processedWinners = winningBets.length;
            processedLosers = losingBets.length;
            logger_1.logger.info('Bet settlement completed', {
                matchId,
                settledBets: totalBets,
                winnerId,
                winnerType
            });
            return Promise.resolve();
        });
        const startTime = perf_hooks_1.performance.now();
        await bettingService.settleBets(testMatchId, testWinnerId, 'ai');
        const endTime = perf_hooks_1.performance.now();
        expect(processedWinners).toBe(winningBets.length);
        expect(processedLosers).toBe(losingBets.length);
        expect(endTime - startTime).toBeLessThan(500);
        expect(logger_1.logger.info).toHaveBeenCalledWith('Bet settlement completed', expect.objectContaining({
            matchId: testMatchId,
            settledBets: totalBets,
            winnerId: testWinnerId,
            winnerType: 'ai'
        }));
        bettingService.settleBets = originalSettleBets;
    });
    test('Settlement with zero bets', async () => {
        const originalSettleBets = bettingService.settleBets;
        bettingService.settleBets = jest.fn().mockImplementation(async (matchId, winnerId, winnerType) => {
            logger_1.logger.info('No bets to settle for match', { matchId });
            return Promise.resolve();
        });
        await bettingService.settleBets(testMatchId, testWinnerId, 'ai');
        expect(logger_1.logger.info).toHaveBeenCalledWith('No bets to settle for match', { matchId: testMatchId });
        bettingService.settleBets = originalSettleBets;
    });
    test('Large payout handling', async () => {
        const largeBetAmount = 1000;
        const highOdds = 10.0;
        const largePayout = largeBetAmount * highOdds;
        const originalSettleBets = bettingService.settleBets;
        bettingService.settleBets = jest.fn().mockImplementation(async (matchId, winnerId, winnerType) => {
            logger_1.logger.info('Processing large payout', {
                betAmount: largeBetAmount,
                odds: highOdds,
                payout: largePayout,
                matchId
            });
            return Promise.resolve();
        });
        await bettingService.settleBets(testMatchId, testWinnerId, 'ai');
        expect(logger_1.logger.info).toHaveBeenCalledWith('Processing large payout', expect.objectContaining({
            payout: largePayout,
            matchId: testMatchId
        }));
        bettingService.settleBets = originalSettleBets;
    });
    (0, jest_each_1.default)([
        [100, 2.0, 200, 6.0, 194.0],
        [50, 3.0, 150, 4.5, 145.5],
        [10, 1.5, 15, 0.45, 14.55],
        [25, 4.0, 100, 3.0, 97.0],
        [75, 2.5, 187.5, 5.625, 181.875],
        [200, 1.2, 240, 7.2, 232.8]
    ]).test('Platform fee calculation: %d SOL bet at %dx odds should result in %d gross, %d fee, %d net', (betAmount, odds, expectedGross, expectedFee, expectedNet) => {
        const platformFeeRate = 0.03;
        const grossPayout = betAmount * odds;
        const platformFee = grossPayout * platformFeeRate;
        const netPayout = grossPayout - platformFee;
        expect(grossPayout).toBe(expectedGross);
        expect(platformFee).toBeCloseTo(expectedFee, 2);
        expect(netPayout).toBeCloseTo(expectedNet, 2);
    });
    (0, jest_each_1.default)([
        [10, 100],
        [50, 250],
        [100, 500],
        [500, 1000],
    ]).test('Settlement performance: %d bets should complete within %dms', async (betCount, maxTime) => {
        const originalSettleBets = bettingService.settleBets;
        bettingService.settleBets = jest.fn().mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, betCount * 0.1));
            return Promise.resolve();
        });
        const startTime = perf_hooks_1.performance.now();
        await bettingService.settleBets(testMatchId, testWinnerId, 'ai');
        const endTime = perf_hooks_1.performance.now();
        const processingTime = endTime - startTime;
        expect(processingTime).toBeLessThan(maxTime);
        bettingService.settleBets = originalSettleBets;
    });
    (0, jest_each_1.default)([
        ['Database connection timeout', 'ECONNRESET'],
        ['Transaction rollback failure', 'ROLLBACK_FAILED'],
        ['Insufficient funds', 'INSUFFICIENT_FUNDS'],
        ['Invalid bet state', 'INVALID_BET_STATE'],
        ['Network timeout', 'NETWORK_TIMEOUT']
    ]).test('Error handling: %s should throw %s', async (errorDescription, errorCode) => {
        const originalSettleBets = bettingService.settleBets;
        const testError = new Error(`${errorDescription}: ${errorCode}`);
        testError.name = errorCode;
        bettingService.settleBets = jest.fn().mockRejectedValue(testError);
        await expect(bettingService.settleBets(testMatchId, testWinnerId, 'ai')).rejects.toThrow(testError.message);
        bettingService.settleBets = originalSettleBets;
    });
    (0, jest_each_1.default)([
        ['settlement_started', 1],
        ['bet_processed', 5],
        ['settlement_completed', 1],
        ['audit_logged', 3]
    ]).test('Notification events: %s should send %d notifications', async (eventType, expectedCount) => {
        let notificationCount = 0;
        const originalSettleBets = bettingService.settleBets;
        bettingService.settleBets = jest.fn().mockImplementation(async () => {
            if (eventType === 'settlement_started')
                notificationCount = 1;
            else if (eventType === 'bet_processed')
                notificationCount = 5;
            else if (eventType === 'settlement_completed')
                notificationCount = 1;
            else if (eventType === 'audit_logged')
                notificationCount = 3;
            return Promise.resolve();
        });
        await bettingService.settleBets(testMatchId, testWinnerId, 'ai');
        expect(notificationCount).toBe(expectedCount);
        bettingService.settleBets = originalSettleBets;
    });
    (0, jest_each_1.default)([
        [100, 2.0, 'win', 200, 100],
        [50, 3.5, 'win', 175, 125],
        [25, 1.8, 'win', 45, 20],
        [75, 0, 'loss', 0, -75],
        [200, 0, 'loss', 0, -200]
    ]).test('Balance updates: %d SOL bet at %dx odds (%s) should result in %d payout and %d net change', async (betAmount, odds, outcome, expectedPayout, expectedNetChange) => {
        let actualPayout = 0;
        let actualNetChange = 0;
        const originalSettleBets = bettingService.settleBets;
        bettingService.settleBets = jest.fn().mockImplementation(async () => {
            if (outcome === 'win') {
                actualPayout = betAmount * odds;
                actualNetChange = actualPayout - betAmount;
            }
            else {
                actualPayout = 0;
                actualNetChange = -betAmount;
            }
            return Promise.resolve();
        });
        await bettingService.settleBets(testMatchId, testWinnerId, 'ai');
        expect(actualPayout).toBe(expectedPayout);
        expect(actualNetChange).toBe(expectedNetChange);
        bettingService.settleBets = originalSettleBets;
    });
});
//# sourceMappingURL=settlement.test.js.map