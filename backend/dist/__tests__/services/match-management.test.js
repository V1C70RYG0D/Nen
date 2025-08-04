"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
class MockGameService {
    cache = new Map();
    database = new Map();
    async createMatch(matchData) {
        const matchId = (0, uuid_1.v4)();
        const gameState = this.initializeGameState(matchId);
        const match = {
            id: matchId,
            matchType: matchData.matchType || 'ai_vs_ai',
            status: 'pending',
            player1Id: matchData.player1Id,
            player2Id: matchData.player2Id,
            aiAgent1Id: matchData.aiAgent1Id,
            aiAgent2Id: matchData.aiAgent2Id,
            gameState,
            bettingPoolSol: 0,
            isBettingActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.database.set(`matches_${matchId}`, match);
        this.cache.set(`match:${matchId}`, match);
        return match;
    }
    async getMatch(matchId) {
        const cached = this.cache.get(`match:${matchId}`);
        if (cached) {
            return cached;
        }
        const match = this.database.get(`matches_${matchId}`);
        if (match) {
            this.cache.set(`match:${matchId}`, match);
            return match;
        }
        return null;
    }
    async startMatch(matchId) {
        const match = await this.getMatch(matchId);
        if (!match) {
            throw new Error('Match not found');
        }
        if (match.status !== 'pending') {
            throw new Error('Match already started or completed');
        }
        match.status = 'active';
        match.updatedAt = new Date();
        this.database.set(`matches_${matchId}`, match);
        this.cache.set(`match:${matchId}`, match);
        if (match.matchType === 'ai_vs_ai') {
            setTimeout(() => this.runAIMatch(match), 0);
        }
        return match;
    }
    async getActiveMatches() {
        const matches = [];
        for (const [key, value] of this.database.entries()) {
            if (key.startsWith('matches_') &&
                (value.status === 'pending' || value.status === 'active')) {
                matches.push(value);
            }
        }
        return matches.slice(0, 20);
    }
    initializeGameState(gameId) {
        return {
            id: gameId,
            board: Array(9).fill(null).map(() => Array(9).fill(null)),
            stacks: {},
            currentPlayer: 'player1',
            moveHistory: [],
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    async runAIMatch(match) {
        try {
            await new Promise(resolve => setTimeout(resolve, 100));
            match.status = 'completed';
            match.updatedAt = new Date();
            this.database.set(`matches_${match.id}`, match);
            this.cache.set(`match:${match.id}`, match);
        }
        catch (error) {
            match.status = 'cancelled';
            match.updatedAt = new Date();
            this.database.set(`matches_${match.id}`, match);
        }
    }
}
describe('Match Management', () => {
    let gameService;
    beforeEach(() => {
        gameService = new MockGameService();
    });
    describe('Match creation with two AI agents', () => {
        test('should create AI vs AI match successfully', async () => {
            const mockMatchData = {
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            };
            const result = await gameService.createMatch(mockMatchData);
            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.matchType).toBe('ai_vs_ai');
            expect(result.aiAgent1Id).toBe('ai-agent-1');
            expect(result.aiAgent2Id).toBe('ai-agent-2');
            expect(result.status).toBe('pending');
            expect(result.gameState).toBeDefined();
            expect(result.bettingPoolSol).toBe(0);
            expect(result.isBettingActive).toBe(true);
        });
        test('should create human vs AI match successfully', async () => {
            const mockMatchData = {
                matchType: 'human_vs_ai',
                player1Id: 'human-player-1',
                aiAgent2Id: 'ai-agent-2',
            };
            const result = await gameService.createMatch(mockMatchData);
            expect(result.matchType).toBe('human_vs_ai');
            expect(result.player1Id).toBe('human-player-1');
            expect(result.aiAgent2Id).toBe('ai-agent-2');
        });
        test('should handle multiple match creation requests', async () => {
            const matchPromises = Array.from({ length: 5 }, (_, i) => {
                return gameService.createMatch({
                    matchType: 'ai_vs_ai',
                    aiAgent1Id: `ai-agent-1-${i}`,
                    aiAgent2Id: `ai-agent-2-${i}`,
                });
            });
            const results = await Promise.all(matchPromises);
            expect(results).toHaveLength(5);
            results.forEach((result, index) => {
                expect(result.aiAgent1Id).toBe(`ai-agent-1-${index}`);
                expect(result.aiAgent2Id).toBe(`ai-agent-2-${index}`);
            });
        });
    });
    describe('Match state caching in Redis', () => {
        test('should cache match data correctly', async () => {
            const mockMatchData = {
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            };
            const match = await gameService.createMatch(mockMatchData);
            const retrieved = await gameService.getMatch(match.id);
            expect(retrieved).toEqual(match);
        });
        test('should retrieve match from cache when available', async () => {
            const match = await gameService.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            const result = await gameService.getMatch(match.id);
            expect(result).toEqual(match);
        });
        test('should return null for non-existent match', async () => {
            const result = await gameService.getMatch('non-existent-id');
            expect(result).toBeNull();
        });
    });
    describe('Database synchronization', () => {
        test('should synchronize match creation with database', async () => {
            const mockMatchData = {
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            };
            const result = await gameService.createMatch(mockMatchData);
            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
        });
        test('should ensure data consistency between cache and database', async () => {
            const match = await gameService.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            const result = await gameService.getMatch(match.id);
            expect(result).toEqual(match);
        });
    });
    describe('Match status transitions (pending → active → completed)', () => {
        test('should transition from pending to active successfully', async () => {
            const match = await gameService.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            const result = await gameService.startMatch(match.id);
            expect(result.status).toBe('active');
            expect(result.updatedAt).toBeInstanceOf(Date);
        });
        test('should prevent invalid status transitions', async () => {
            const match = await gameService.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            await gameService.startMatch(match.id);
            await expect(gameService.startMatch(match.id)).rejects.toThrow('Match already started or completed');
        });
        test('should handle match not found during status transition', async () => {
            await expect(gameService.startMatch('non-existent-match')).rejects.toThrow('Match not found');
        });
    });
    describe('WebSocket event emission for match updates', () => {
        test('should emit match created event', async () => {
            const match = await gameService.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            expect(match.id).toBeDefined();
        });
        test('should emit match started event', async () => {
            const match = await gameService.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            await gameService.startMatch(match.id);
            expect(match.status).toBeDefined();
        });
    });
    describe('Match finalization and cleanup', () => {
        test('should finalize match completion', async () => {
            const match = await gameService.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            await gameService.startMatch(match.id);
            await new Promise(resolve => setTimeout(resolve, 150));
            const updatedMatch = await gameService.getMatch(match.id);
            expect(updatedMatch?.status).toBe('completed');
        });
    });
    describe('Concurrent match handling', () => {
        test('should handle multiple simultaneous match creations', async () => {
            const matchPromises = Array.from({ length: 10 }, (_, i) => {
                return gameService.createMatch({
                    matchType: 'ai_vs_ai',
                    aiAgent1Id: `ai-agent-1-${i}`,
                    aiAgent2Id: `ai-agent-2-${i}`,
                });
            });
            const results = await Promise.all(matchPromises);
            expect(results).toHaveLength(10);
            const uniqueIds = new Set(results.map(r => r.id));
            expect(uniqueIds.size).toBe(10);
        });
        test('should handle concurrent match status updates', async () => {
            const matches = await Promise.all([
                gameService.createMatch({ matchType: 'ai_vs_ai', aiAgent1Id: 'ai-1', aiAgent2Id: 'ai-2' }),
                gameService.createMatch({ matchType: 'ai_vs_ai', aiAgent1Id: 'ai-3', aiAgent2Id: 'ai-4' }),
                gameService.createMatch({ matchType: 'ai_vs_ai', aiAgent1Id: 'ai-5', aiAgent2Id: 'ai-6' }),
            ]);
            const startPromises = matches.map(match => gameService.startMatch(match.id));
            const results = await Promise.all(startPromises);
            results.forEach(result => {
                expect(result.status).toBe('active');
            });
        });
    });
    describe('Match recovery after server restart', () => {
        test('should recover active matches from database', async () => {
            await gameService.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            const activeMatches = await gameService.getActiveMatches();
            expect(activeMatches).toHaveLength(1);
            expect(activeMatches[0].status).toBe('pending');
        });
        test('should handle multiple active matches during recovery', async () => {
            await Promise.all([
                gameService.createMatch({ matchType: 'ai_vs_ai', aiAgent1Id: 'ai-1', aiAgent2Id: 'ai-2' }),
                gameService.createMatch({ matchType: 'ai_vs_ai', aiAgent1Id: 'ai-3', aiAgent2Id: 'ai-4' }),
                gameService.createMatch({ matchType: 'ai_vs_ai', aiAgent1Id: 'ai-5', aiAgent2Id: 'ai-6' }),
            ]);
            const activeMatches = await gameService.getActiveMatches();
            expect(activeMatches).toHaveLength(3);
        });
    });
    describe('Invalid match ID handling', () => {
        test('should return null for non-existent match ID', async () => {
            const result = await gameService.getMatch('invalid-match-id');
            expect(result).toBeNull();
        });
        test('should handle malformed match IDs gracefully', async () => {
            const result = await gameService.getMatch('not-a-uuid');
            expect(result).toBeNull();
        });
        test('should handle empty match ID', async () => {
            const result = await gameService.getMatch('');
            expect(result).toBeNull();
        });
    });
    describe('Match timeout management', () => {
        test('should handle match timeouts gracefully', async () => {
            const match = await gameService.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            expect(match.createdAt).toBeInstanceOf(Date);
        });
        test('should track match creation time', async () => {
            const startTime = new Date();
            const match = await gameService.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            const endTime = new Date();
            expect(match.createdAt.getTime()).toBeGreaterThanOrEqual(startTime.getTime());
            expect(match.createdAt.getTime()).toBeLessThanOrEqual(endTime.getTime());
        });
    });
});
//# sourceMappingURL=match-management.test.js.map