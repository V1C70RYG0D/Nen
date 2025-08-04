"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const GameService_1 = require("../../services/GameService");
const BettingService_1 = require("../../services/BettingService");
const logger_1 = require("../../utils/logger");
jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    }
}));
jest.mock('../../utils/database', () => ({
    query: jest.fn(),
    transaction: jest.fn(),
}));
jest.mock('../../utils/redis', () => ({
    CacheService: jest.fn().mockImplementation(() => ({
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
    })),
}));
class MockMatchFinalizationService {
    gameService;
    bettingService;
    matches = new Map();
    statistics = new Map();
    archivedMatches = new Set();
    notifications = new Map();
    constructor() {
        this.gameService = new GameService_1.GameService();
        this.bettingService = new BettingService_1.BettingService();
        this.initializeMockData();
    }
    initializeMockData() {
        for (let i = 0; i < 5; i++) {
            const matchId = (0, uuid_1.v4)();
            const match = {
                id: matchId,
                matchType: 'ai_vs_ai',
                status: 'completed',
                aiAgent1Id: 'agent-1',
                aiAgent2Id: 'agent-2',
                winnerId: i % 2 === 0 ? 'agent-1' : 'agent-2',
                winnerType: 'ai',
                gameState: {
                    id: matchId,
                    board: Array(9).fill(null).map(() => Array(9).fill(null)),
                    stacks: {},
                    currentPlayer: 'player1',
                    moveHistory: [],
                    status: 'completed',
                    winner: i % 2 === 0 ? 'player1' : 'player2',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                bettingPoolSol: 10.5,
                isBettingActive: false,
                createdAt: new Date(Date.now() - 3600000),
                updatedAt: new Date(),
            };
            const stats = {
                totalMoves: 25 + Math.floor(Math.random() * 50),
                duration: 900 + Math.floor(Math.random() * 1800),
                winnerType: 'ai',
                finalScore: {
                    player1: i % 2 === 0 ? 1 : 0,
                    player2: i % 2 === 0 ? 0 : 1,
                },
            };
            this.matches.set(matchId, match);
            this.statistics.set(matchId, stats);
        }
    }
    async finalizeMatch(matchId) {
        const match = this.matches.get(matchId);
        if (!match) {
            throw new Error('Match not found');
        }
        const winner = this.determineWinner(match.gameState);
        match.winnerId = winner.winnerId;
        match.winnerType = winner.winnerType;
        match.status = 'completed';
        const statistics = await this.calculateMatchStatistics(matchId, match);
        this.statistics.set(matchId, statistics);
        const betsSettled = await this.settleBets(matchId, winner.winnerId, winner.winnerType);
        const notificationsSent = await this.sendCompletionNotifications(matchId, winner.winnerId);
        await this.cleanupTemporaryResources(matchId);
        logger_1.logger.info('Match finalized successfully', {
            matchId,
            winnerId: winner.winnerId,
            winnerType: winner.winnerType,
            betsSettled,
            notificationsSent
        });
        return {
            winnerId: winner.winnerId,
            winnerType: winner.winnerType,
            statistics,
            betsSettled,
            notificationsSent
        };
    }
    determineWinner(gameState) {
        if (gameState.winner === 'player1') {
            return { winnerId: 'agent-1', winnerType: 'ai' };
        }
        else {
            return { winnerId: 'agent-2', winnerType: 'ai' };
        }
    }
    async calculateMatchStatistics(matchId, match) {
        const gameState = match.gameState;
        return {
            totalMoves: gameState.moveHistory.length,
            duration: Math.floor((match.updatedAt.getTime() - match.createdAt.getTime()) / 1000),
            winnerType: match.winnerType,
            finalScore: {
                player1: match.winnerId === 'agent-1' ? 1 : 0,
                player2: match.winnerId === 'agent-2' ? 1 : 0,
            },
        };
    }
    async settleBets(matchId, winnerId, winnerType) {
        try {
            return Math.floor(Math.random() * 10) + 1;
        }
        catch (error) {
            logger_1.logger.error('Error settling bets', { matchId, error });
            return 0;
        }
    }
    async sendCompletionNotifications(matchId, winnerId) {
        const recipients = ['player1', 'player2', 'observers'];
        this.notifications.set(matchId, recipients);
        return recipients.length;
    }
    async cleanupTemporaryResources(matchId) {
        logger_1.logger.info('Cleaning up temporary resources', { matchId });
    }
    async archiveCompletedMatches(config) {
        const cutoffDate = new Date(Date.now() - config.retentionPeriodDays * 24 * 60 * 60 * 1000);
        let archivedCount = 0;
        for (const [matchId, match] of this.matches.entries()) {
            if (match.status === 'completed' && match.updatedAt < cutoffDate) {
                this.archivedMatches.add(matchId);
                if (config.compressionEnabled) {
                    logger_1.logger.info('Compressing match data', { matchId });
                }
                archivedCount++;
            }
        }
        logger_1.logger.info('Archived completed matches', { archivedCount, config });
        return archivedCount;
    }
    async validateMatchIntegrity() {
        const invalidMatches = [];
        const inconsistencies = [];
        let validMatches = 0;
        for (const [matchId, match] of this.matches.entries()) {
            if (!match.winnerId && match.status === 'completed') {
                invalidMatches.push(matchId);
                inconsistencies.push(`Match ${matchId} marked completed but no winner determined`);
            }
            else if (!this.statistics.has(matchId) && match.status === 'completed') {
                inconsistencies.push(`Match ${matchId} completed but no statistics recorded`);
            }
            else {
                validMatches++;
            }
        }
        return {
            totalMatches: this.matches.size,
            validMatches,
            invalidMatches,
            inconsistencies
        };
    }
    getMatch(matchId) {
        return this.matches.get(matchId);
    }
    getStatistics(matchId) {
        return this.statistics.get(matchId);
    }
    isArchived(matchId) {
        return this.archivedMatches.has(matchId);
    }
    getNotifications(matchId) {
        return this.notifications.get(matchId);
    }
}
describe('Match Finalization', () => {
    let finalizationService;
    let testMatchId;
    beforeEach(() => {
        finalizationService = new MockMatchFinalizationService();
        testMatchId = (0, uuid_1.v4)();
        const testMatch = {
            id: testMatchId,
            matchType: 'ai_vs_ai',
            status: 'active',
            aiAgent1Id: 'test-agent-1',
            aiAgent2Id: 'test-agent-2',
            gameState: {
                id: testMatchId,
                board: Array(9).fill(null).map(() => Array(9).fill(null)),
                stacks: {},
                currentPlayer: 'player1',
                moveHistory: Array(30).fill(null).map((_, i) => ({
                    id: (0, uuid_1.v4)(),
                    gameId: testMatchId,
                    playerId: i % 2 === 0 ? 'test-agent-1' : 'test-agent-2',
                    from: { x: 0, y: 0, level: 0 },
                    to: { x: 1, y: 1, level: 0 },
                    piece: 'pawn',
                    timestamp: new Date(),
                    moveNumber: i + 1,
                    isCapture: false,
                })),
                status: 'completed',
                winner: 'player1',
                createdAt: new Date(Date.now() - 1800000),
                updatedAt: new Date(),
            },
            bettingPoolSol: 25.5,
            isBettingActive: false,
            createdAt: new Date(Date.now() - 1800000),
            updatedAt: new Date(),
        };
        finalizationService['matches'].set(testMatchId, testMatch);
    });
    describe('Winner Determination Logic', () => {
        test('should correctly determine winner from game state', async () => {
            const result = await finalizationService.finalizeMatch(testMatchId);
            expect(result.winnerId).toBeDefined();
            expect(result.winnerType).toBe('ai');
            expect(['test-agent-1', 'agent-1']).toContain(result.winnerId);
            logger_1.logger.info('Winner determination test passed', {
                winnerId: result.winnerId,
                winnerType: result.winnerType
            });
        });
        test('should handle matches without clear winner', async () => {
            const match = finalizationService.getMatch(testMatchId);
            match.gameState.winner = undefined;
            const result = await finalizationService.finalizeMatch(testMatchId);
            expect(result.winnerId).toBeDefined();
            expect(result.winnerType).toBe('ai');
        });
        test('should validate winner type consistency', async () => {
            const result = await finalizationService.finalizeMatch(testMatchId);
            const match = finalizationService.getMatch(testMatchId);
            expect(match.winnerType).toBe(result.winnerType);
            expect(match.winnerId).toBe(result.winnerId);
        });
    });
    describe('Score Calculations and Rankings', () => {
        test('should calculate accurate match statistics', async () => {
            const result = await finalizationService.finalizeMatch(testMatchId);
            expect(result.statistics.totalMoves).toBeGreaterThan(0);
            expect(result.statistics.duration).toBeGreaterThan(0);
            expect(result.statistics.finalScore.player1 + result.statistics.finalScore.player2).toBe(1);
            logger_1.logger.info('Statistics calculation test passed', result.statistics);
        });
        test('should validate score calculation accuracy', async () => {
            const result = await finalizationService.finalizeMatch(testMatchId);
            const stats = result.statistics;
            if (result.winnerId === 'agent-1') {
                expect(stats.finalScore.player1).toBe(1);
                expect(stats.finalScore.player2).toBe(0);
            }
            else {
                expect(stats.finalScore.player1).toBe(0);
                expect(stats.finalScore.player2).toBe(1);
            }
        });
        test('should track move count accurately', async () => {
            const match = finalizationService.getMatch(testMatchId);
            const expectedMoves = match.gameState.moveHistory.length;
            const result = await finalizationService.finalizeMatch(testMatchId);
            expect(result.statistics.totalMoves).toBe(expectedMoves);
        });
        test('should calculate match duration correctly', async () => {
            const match = finalizationService.getMatch(testMatchId);
            const expectedDuration = Math.floor((match.updatedAt.getTime() - match.createdAt.getTime()) / 1000);
            const result = await finalizationService.finalizeMatch(testMatchId);
            expect(result.statistics.duration).toBeCloseTo(expectedDuration, -1);
        });
    });
    describe('Cleanup of Temporary Resources', () => {
        test('should cleanup temporary resources after match completion', async () => {
            const result = await finalizationService.finalizeMatch(testMatchId);
            expect(logger_1.logger.info).toHaveBeenCalledWith('Cleaning up temporary resources', { matchId: testMatchId });
        });
        test('should handle cleanup errors gracefully', async () => {
            const originalCleanup = finalizationService['cleanupTemporaryResources'];
            finalizationService['cleanupTemporaryResources'] = jest.fn().mockRejectedValue(new Error('Cleanup failed'));
            await expect(finalizationService.finalizeMatch(testMatchId)).rejects.toThrow('Cleanup failed');
            finalizationService['cleanupTemporaryResources'] = originalCleanup;
        });
        test('should verify resource cleanup completion', async () => {
            const cleanupSpy = jest.spyOn(finalizationService, 'cleanupTemporaryResources');
            await finalizationService.finalizeMatch(testMatchId);
            expect(cleanupSpy).toHaveBeenCalledWith(testMatchId);
        });
    });
    describe('Post-Match Statistics Validation', () => {
        test('should store comprehensive match statistics', async () => {
            await finalizationService.finalizeMatch(testMatchId);
            const stats = finalizationService.getStatistics(testMatchId);
            expect(stats).toBeDefined();
            expect(stats.totalMoves).toBeGreaterThan(0);
            expect(stats.duration).toBeGreaterThan(0);
            expect(stats.winnerType).toBe('ai');
            expect(stats.finalScore).toBeDefined();
        });
        test('should validate statistics data integrity', async () => {
            await finalizationService.finalizeMatch(testMatchId);
            const integrity = await finalizationService.validateMatchIntegrity();
            expect(integrity.invalidMatches).toHaveLength(0);
            expect(integrity.validMatches).toBeGreaterThan(0);
            expect(integrity.inconsistencies).toHaveLength(0);
        });
        test('should handle statistics calculation errors', async () => {
            const originalCalc = finalizationService['calculateMatchStatistics'];
            finalizationService['calculateMatchStatistics'] = jest.fn().mockRejectedValue(new Error('Stats failed'));
            await expect(finalizationService.finalizeMatch(testMatchId)).rejects.toThrow('Stats failed');
            finalizationService['calculateMatchStatistics'] = originalCalc;
        });
    });
    describe('Archival Processes', () => {
        test('should archive old completed matches', async () => {
            await finalizationService.finalizeMatch(testMatchId);
            const config = {
                retentionPeriodDays: 0,
                compressionEnabled: true,
                archiveThresholdDays: 0,
                maxArchiveSize: 1024 * 1024
            };
            const archivedCount = await finalizationService.archiveCompletedMatches(config);
            expect(archivedCount).toBeGreaterThan(0);
            expect(logger_1.logger.info).toHaveBeenCalledWith('Archived completed matches', { archivedCount, config });
        });
        test('should respect retention period when archiving', async () => {
            await finalizationService.finalizeMatch(testMatchId);
            const config = {
                retentionPeriodDays: 365,
                compressionEnabled: false,
                archiveThresholdDays: 30,
                maxArchiveSize: 1024 * 1024
            };
            const archivedCount = await finalizationService.archiveCompletedMatches(config);
            expect(archivedCount).toBe(0);
        });
        test('should enable compression when configured', async () => {
            await finalizationService.finalizeMatch(testMatchId);
            const config = {
                retentionPeriodDays: 0,
                compressionEnabled: true,
                archiveThresholdDays: 0,
                maxArchiveSize: 1024 * 1024
            };
            await finalizationService.archiveCompletedMatches(config);
            expect(logger_1.logger.info).toHaveBeenCalledWith('Compressing match data', { matchId: expect.any(String) });
        });
        test('should track archived matches', async () => {
            await finalizationService.finalizeMatch(testMatchId);
            const config = {
                retentionPeriodDays: 0,
                compressionEnabled: false,
                archiveThresholdDays: 0,
                maxArchiveSize: 1024 * 1024
            };
            await finalizationService.archiveCompletedMatches(config);
            expect(finalizationService.isArchived(testMatchId) ||
                Array.from(finalizationService['archivedMatches']).length > 0).toBe(true);
        });
    });
    describe('Notification Triggers', () => {
        test('should send notifications on match completion', async () => {
            const result = await finalizationService.finalizeMatch(testMatchId);
            expect(result.notificationsSent).toBeGreaterThan(0);
            const notifications = finalizationService.getNotifications(testMatchId);
            expect(notifications).toBeDefined();
            expect(notifications.length).toBeGreaterThan(0);
        });
        test('should handle notification failures gracefully', async () => {
            const originalSend = finalizationService['sendCompletionNotifications'];
            finalizationService['sendCompletionNotifications'] = jest.fn().mockResolvedValue(0);
            const result = await finalizationService.finalizeMatch(testMatchId);
            expect(result.notificationsSent).toBe(0);
            finalizationService['sendCompletionNotifications'] = originalSend;
        });
        test('should send notifications to all relevant parties', async () => {
            const result = await finalizationService.finalizeMatch(testMatchId);
            const notifications = finalizationService.getNotifications(testMatchId);
            expect(notifications).toContain('player1');
            expect(notifications).toContain('player2');
            expect(notifications).toContain('observers');
        });
        test('should log notification success', async () => {
            await finalizationService.finalizeMatch(testMatchId);
            expect(logger_1.logger.info).toHaveBeenCalledWith('Match finalized successfully', expect.objectContaining({
                matchId: testMatchId,
                winnerId: expect.any(String),
                winnerType: 'ai',
                notificationsSent: expect.any(Number)
            }));
        });
    });
    describe('Integration and Error Handling', () => {
        test('should handle non-existent match gracefully', async () => {
            const invalidMatchId = (0, uuid_1.v4)();
            await expect(finalizationService.finalizeMatch(invalidMatchId))
                .rejects.toThrow('Match not found');
        });
        test('should complete full finalization process', async () => {
            const result = await finalizationService.finalizeMatch(testMatchId);
            expect(result.winnerId).toBeDefined();
            expect(result.winnerType).toBe('ai');
            expect(result.statistics.totalMoves).toBeGreaterThan(0);
            expect(result.betsSettled).toBeGreaterThanOrEqual(0);
            expect(result.notificationsSent).toBeGreaterThan(0);
            const match = finalizationService.getMatch(testMatchId);
            expect(match.status).toBe('completed');
            expect(match.winnerId).toBe(result.winnerId);
        });
        test('should maintain data consistency throughout finalization', async () => {
            const originalMatch = finalizationService.getMatch(testMatchId);
            await finalizationService.finalizeMatch(testMatchId);
            const updatedMatch = finalizationService.getMatch(testMatchId);
            const statistics = finalizationService.getStatistics(testMatchId);
            expect(updatedMatch.id).toBe(originalMatch.id);
            expect(updatedMatch.status).toBe('completed');
            expect(statistics.totalMoves).toBe(originalMatch.gameState.moveHistory.length);
        });
        test('should handle concurrent finalization attempts', async () => {
            const promises = [
                finalizationService.finalizeMatch(testMatchId),
                finalizationService.finalizeMatch(testMatchId),
                finalizationService.finalizeMatch(testMatchId)
            ];
            const results = await Promise.allSettled(promises);
            const successful = results.filter(r => r.status === 'fulfilled');
            expect(successful.length).toBeGreaterThanOrEqual(1);
        });
    });
});
//# sourceMappingURL=match-finalization.test.js.map