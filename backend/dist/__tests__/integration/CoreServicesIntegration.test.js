"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GameService_1 = require("../../services/GameService");
const BettingService_1 = require("../../services/BettingService");
const AIService_1 = require("../../services/AIService");
const redis_1 = require("../../utils/redis");
jest.mock('../../utils/database');
jest.mock('../../utils/redis');
jest.mock('../../utils/logger');
describe('Core Services Integration - 100% Coverage', () => {
    let gameService;
    let bettingService;
    let aiService;
    let cacheService;
    beforeEach(() => {
        jest.clearAllMocks();
        gameService = new GameService_1.GameService();
        bettingService = new BettingService_1.BettingService();
        aiService = new AIService_1.AIService();
        cacheService = new redis_1.CacheService();
    });
    describe('GameService Comprehensive Tests', () => {
        it('should create matches with valid AI agents', async () => {
            const mockQuery = require('../../utils/database').query;
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'match-123',
                        ai_agent1_id: 'agent-1',
                        ai_agent2_id: 'agent-2',
                        status: 'pending'
                    }]
            });
            const match = await gameService.createMatch('agent-1', 'agent-2');
            expect(match).toBeDefined();
            expect(match.aiAgent1Id).toBe('agent-1');
            expect(match.aiAgent2Id).toBe('agent-2');
            expect(match.status).toBe('pending');
        });
        it('should start pending matches successfully', async () => {
            const mockQuery = require('../../utils/database').query;
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 'match-123', status: 'pending' }] })
                .mockResolvedValueOnce({ rows: [{ id: 'match-123', status: 'active' }] });
            const result = await gameService.startMatch('match-123');
            expect(result.status).toBe('active');
        });
        it('should process moves with validation', async () => {
            const mockQuery = require('../../utils/database').query;
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'match-123',
                        status: 'active',
                        current_player: 1,
                        game_state: JSON.stringify({ board: [], turn: 1 })
                    }]
            });
            const moveResult = await gameService.processMove('match-123', 'agent-1', { type: 'move', position: [2, 3] });
            expect(moveResult.valid).toBe(true);
        });
        it('should handle invalid moves appropriately', async () => {
            const mockQuery = require('../../utils/database').query;
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'match-123',
                        status: 'active',
                        current_player: 2,
                        game_state: JSON.stringify({ board: [], turn: 2 })
                    }]
            });
            const moveResult = await gameService.processMove('match-123', 'agent-1', { type: 'invalid' });
            expect(moveResult.valid).toBe(false);
        });
        it('should get match results for completed games', async () => {
            const mockQuery = require('../../utils/database').query;
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'match-123',
                        status: 'completed',
                        winner_id: 'agent-1',
                        final_state: JSON.stringify({ score: [100, 85], moves: 42 })
                    }]
            });
            const result = await gameService.getMatchResult('match-123');
            expect(result.winner).toBe('agent-1');
            expect(result.moves).toBe(42);
        });
    });
    describe('BettingService Comprehensive Tests', () => {
        it('should place bets on active matches', async () => {
            const mockQuery = require('../../utils/database').query;
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 'match-123', status: 'active' }] })
                .mockResolvedValueOnce({ rows: [{ sol_balance: 100 }] })
                .mockResolvedValueOnce({ rows: [{ id: 'bet-456' }] });
            const bet = await bettingService.placeBet('user-123', 'match-123', 'agent-1', 10);
            expect(bet.id).toBe('bet-456');
            expect(bet.amount).toBe(10);
            expect(bet.predictedWinner).toBe('agent-1');
        });
        it('should reject bets with insufficient funds', async () => {
            const mockQuery = require('../../utils/database').query;
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 'match-123', status: 'active' }] })
                .mockResolvedValueOnce({ rows: [{ sol_balance: 5 }] });
            await expect(bettingService.placeBet('user-123', 'match-123', 'agent-1', 10))
                .rejects.toThrow('Insufficient funds');
        });
        it('should calculate and distribute winnings correctly', async () => {
            const mockQuery = require('../../utils/database').query;
            mockQuery
                .mockResolvedValueOnce({
                rows: [
                    { id: 'bet-1', user_id: 'user-1', amount: 10, predicted_winner: 'agent-1' },
                    { id: 'bet-2', user_id: 'user-2', amount: 5, predicted_winner: 'agent-2' }
                ]
            })
                .mockResolvedValue({ rows: [] });
            const winnings = await bettingService.processMatchBets('match-123', 'agent-1');
            expect(winnings.totalPool).toBe(15);
            expect(winnings.winnersCount).toBe(1);
        });
        it('should handle matches with no bets', async () => {
            const mockQuery = require('../../utils/database').query;
            mockQuery.mockResolvedValueOnce({ rows: [] });
            const winnings = await bettingService.processMatchBets('match-123', 'agent-1');
            expect(winnings.totalPool).toBe(0);
            expect(winnings.winnersCount).toBe(0);
        });
    });
    describe('AIService Comprehensive Tests', () => {
        it('should create AI agents with proper initialization', async () => {
            const mockQuery = require('../../utils/database').query;
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'agent-123',
                        name: 'Test Agent',
                        elo_rating: 1500,
                        personality_traits: JSON.stringify({ aggression: 0.5 })
                    }]
            });
            const agent = await aiService.createAgent('Test Agent', { aggression: 0.5 });
            expect(agent.id).toBe('agent-123');
            expect(agent.name).toBe('Test Agent');
            expect(agent.eloRating).toBe(1500);
        });
        it('should update agent skills based on performance', async () => {
            const mockQuery = require('../../utils/database').query;
            mockQuery.mockResolvedValue({ rows: [] });
            await aiService.updateAgentSkills('agent-123', 1550, { aggression: 0.6 });
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE ai_agents'), expect.arrayContaining([1550, 'agent-123']));
        });
        it('should get available agents for matches', async () => {
            const mockQuery = require('../../utils/database').query;
            mockQuery.mockResolvedValueOnce({
                rows: [
                    { id: 'agent-1', name: 'Agent 1', elo_rating: 1500 },
                    { id: 'agent-2', name: 'Agent 2', elo_rating: 1600 },
                    { id: 'agent-3', name: 'Agent 3', elo_rating: 1450 }
                ]
            });
            const agents = await aiService.getAvailableAgents();
            expect(agents).toHaveLength(3);
            expect(agents[0].id).toBe('agent-1');
            expect(agents[1].eloRating).toBe(1600);
        });
        it('should handle agent not found scenarios', async () => {
            const mockQuery = require('../../utils/database').query;
            mockQuery.mockResolvedValueOnce({ rows: [] });
            const agent = await aiService.getAgent('nonexistent');
            expect(agent).toBeNull();
        });
    });
    describe('CacheService Performance Tests', () => {
        it('should set and get cached values', async () => {
            const mockRedis = require('../../utils/redis');
            mockRedis.prototype.set = jest.fn().mockResolvedValue('OK');
            mockRedis.prototype.get = jest.fn().mockResolvedValue('cached_value');
            await cacheService.set('test_key', 'test_value', 300);
            const value = await cacheService.get('test_key');
            expect(value).toBe('cached_value');
        });
        it('should handle cache misses gracefully', async () => {
            const mockRedis = require('../../utils/redis');
            mockRedis.prototype.get = jest.fn().mockResolvedValue(null);
            const value = await cacheService.get('missing_key');
            expect(value).toBeNull();
        });
        it('should manage list operations for game queues', async () => {
            const mockRedis = require('../../utils/redis');
            mockRedis.prototype.lpush = jest.fn().mockResolvedValue(1);
            mockRedis.prototype.lrange = jest.fn().mockResolvedValue(['game-1', 'game-2']);
            await cacheService.lpush('game_queue', 'game-1');
            const queue = await cacheService.lrange('game_queue', 0, -1);
            expect(queue).toContain('game-1');
            expect(queue).toContain('game-2');
        });
        it('should handle Redis connection failures', async () => {
            const mockRedis = require('../../utils/redis');
            mockRedis.prototype.get = jest.fn().mockRejectedValue(new Error('Redis connection failed'));
            await expect(cacheService.get('test_key')).rejects.toThrow('Redis connection failed');
        });
    });
    describe('Cross-Service Integration', () => {
        it('should coordinate game creation with AI agent assignment', async () => {
            const mockQuery = require('../../utils/database').query;
            mockQuery.mockResolvedValueOnce({
                rows: [
                    { id: 'agent-1', elo_rating: 1500 },
                    { id: 'agent-2', elo_rating: 1510 }
                ]
            });
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'match-123',
                        ai_agent1_id: 'agent-1',
                        ai_agent2_id: 'agent-2'
                    }]
            });
            const agents = await aiService.getAvailableAgents();
            const match = await gameService.createMatch(agents[0].id, agents[1].id);
            expect(match.aiAgent1Id).toBe('agent-1');
            expect(match.aiAgent2Id).toBe('agent-2');
        });
        it('should process betting and game results together', async () => {
            const mockQuery = require('../../utils/database').query;
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'match-123',
                        status: 'completed',
                        winner_id: 'agent-1'
                    }]
            });
            mockQuery.mockResolvedValueOnce({
                rows: [{
                        id: 'bet-456',
                        user_id: 'user-123',
                        amount: 10,
                        predicted_winner: 'agent-1'
                    }]
            });
            const matchResult = await gameService.getMatchResult('match-123');
            const bettingResult = await bettingService.processMatchBets('match-123', matchResult.winner);
            expect(matchResult.winner).toBe('agent-1');
            expect(bettingResult.winnersCount).toBeGreaterThan(0);
        });
        it('should update AI agent ratings after match completion', async () => {
            const mockQuery = require('../../utils/database').query;
            mockQuery
                .mockResolvedValueOnce({
                rows: [{ winner_id: 'agent-1', ai_agent1_id: 'agent-1', ai_agent2_id: 'agent-2' }]
            })
                .mockResolvedValue({ rows: [] });
            const matchResult = await gameService.getMatchResult('match-123');
            await aiService.updateAgentSkills('agent-1', 1520, {});
            await aiService.updateAgentSkills('agent-2', 1490, {});
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE ai_agents'), expect.arrayContaining([1520, 'agent-1']));
        });
    });
    describe('Error Recovery and Resilience', () => {
        it('should handle database transaction failures', async () => {
            const mockQuery = require('../../utils/database').query;
            mockQuery.mockRejectedValue(new Error('Transaction failed'));
            await expect(gameService.createMatch('agent-1', 'agent-2'))
                .rejects.toThrow('Transaction failed');
        });
        it('should handle concurrent access to shared resources', async () => {
            const mockQuery = require('../../utils/database').query;
            mockQuery.mockResolvedValue({ rows: [{ id: 'match-123' }] });
            const operations = Array.from({ length: 5 }, (_, i) => gameService.processMove('match-123', `agent-${i}`, { type: 'move' }));
            const results = await Promise.allSettled(operations);
            const successes = results.filter(r => r.status === 'fulfilled');
            expect(successes.length).toBeGreaterThan(0);
        });
        it('should maintain data consistency during failures', async () => {
            const mockQuery = require('../../utils/database').query;
            mockQuery
                .mockResolvedValueOnce({ rows: [{ sol_balance: 100 }] })
                .mockRejectedValueOnce(new Error('Bet insert failed'));
            await expect(bettingService.placeBet('user-123', 'match-123', 'agent-1', 10))
                .rejects.toThrow('Bet insert failed');
        });
    });
    describe('Performance and Scalability', () => {
        it('should handle high-frequency operations efficiently', async () => {
            const mockQuery = require('../../utils/database').query;
            mockQuery.mockResolvedValue({ rows: [{ result: 'success' }] });
            const startTime = Date.now();
            const operations = Array.from({ length: 100 }, (_, i) => cacheService.set(`key-${i}`, `value-${i}`, 60));
            await Promise.all(operations);
            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(1000);
        });
        it('should scale with multiple concurrent matches', async () => {
            const mockQuery = require('../../utils/database').query;
            mockQuery.mockResolvedValue({ rows: [{ id: 'match-123' }] });
            const matchPromises = Array.from({ length: 10 }, (_, i) => gameService.createMatch(`agent-${i}-1`, `agent-${i}-2`));
            const matches = await Promise.all(matchPromises);
            expect(matches).toHaveLength(10);
            matches.forEach(match => expect(match.id).toBeDefined());
        });
    });
});
exports.default = {
    testEnvironment: 'node',
    coverageThreshold: {
        global: {
            branches: 100,
            functions: 100,
            lines: 100,
            statements: 100
        }
    }
};
//# sourceMappingURL=CoreServicesIntegration.test.js.map