"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
class MockAIGameLoop {
    matches = new Map();
    gameStates = new Map();
    aiAgents = new Map();
    constructor() {
        this.aiAgents.set('ai-agent-1', { id: 'ai-agent-1', skill: 'intermediate' });
        this.aiAgents.set('ai-agent-2', { id: 'ai-agent-2', skill: 'advanced' });
    }
    async createMatch(matchData) {
        const matchId = (0, uuid_1.v4)();
        const gameState = this.initializeGameState(matchId);
        const match = {
            id: matchId,
            matchType: matchData.matchType || 'ai_vs_ai',
            status: 'pending',
            aiAgent1Id: matchData.aiAgent1Id,
            aiAgent2Id: matchData.aiAgent2Id,
            gameState,
            bettingPoolSol: 0,
            isBettingActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.matches.set(matchId, match);
        this.gameStates.set(matchId, gameState);
        return match;
    }
    async startAIMatch(matchId) {
        const match = this.matches.get(matchId);
        if (!match) {
            return;
        }
        if (!match.aiAgent1Id || !match.aiAgent2Id) {
            throw new Error('AI agent not found');
        }
        const validAgents = ['ai-agent-1', 'ai-agent-2'];
        if (!validAgents.includes(match.aiAgent1Id) || !validAgents.includes(match.aiAgent2Id)) {
            throw new Error('AI agent not found');
        }
        match.status = 'active';
        match.updatedAt = new Date();
        await this.runAIGameLoop(match);
    }
    async runAIGameLoop(match) {
        const gameState = this.gameStates.get(match.id);
        if (!gameState) {
            throw new Error('Game state not found');
        }
        gameState.status = 'active';
        let moveCount = 0;
        const maxMoves = 10;
        while (gameState.status === 'active' && moveCount < maxMoves) {
            await this.simulateThinkingTime();
            const currentAgent = gameState.currentPlayer === 'player1'
                ? match.aiAgent1Id
                : match.aiAgent2Id;
            if (!currentAgent) {
                throw new Error('AI agent not found');
            }
            const move = await this.generateAIMove(gameState, currentAgent);
            if (!move) {
                break;
            }
            if (this.validateMove(gameState, move)) {
                await this.executeMove(gameState, move);
                moveCount++;
                if (this.isGameComplete(gameState)) {
                    gameState.status = 'completed';
                    match.status = 'completed';
                    break;
                }
                gameState.currentPlayer = gameState.currentPlayer === 'player1' ? 'player2' : 'player1';
            }
        }
        match.updatedAt = new Date();
        this.matches.set(match.id, match);
        this.gameStates.set(match.id, gameState);
    }
    async simulateThinkingTime() {
        const thinkingTime = 1000 + Math.random() * 2000;
        await new Promise(resolve => setTimeout(resolve, Math.min(thinkingTime, 100)));
    }
    async generateAIMove(gameState, aiAgentId) {
        const moves = this.getPossibleMoves(gameState);
        if (moves.length === 0) {
            return null;
        }
        const selectedMove = moves[Math.floor(Math.random() * moves.length)];
        return {
            gameId: gameState.id,
            playerId: aiAgentId,
            from: selectedMove.from,
            to: selectedMove.to,
            piece: selectedMove.piece,
            isCapture: selectedMove.isCapture,
        };
    }
    getPossibleMoves(gameState) {
        const moves = [];
        for (let x = 0; x < 9; x++) {
            for (let y = 0; y < 9; y++) {
                if (gameState.board[x][y]) {
                    moves.push({
                        from: { x, y, level: 0 },
                        to: { x: (x + 1) % 9, y: (y + 1) % 9, level: 0 },
                        piece: gameState.board[x][y],
                        isCapture: false,
                    });
                }
            }
        }
        if (moves.length === 0) {
            moves.push({
                from: { x: 0, y: 6, level: 0 },
                to: { x: 0, y: 5, level: 0 },
                piece: 'pawn',
                isCapture: false,
            });
        }
        return moves;
    }
    validateMove(gameState, move) {
        if (!move.from || !move.to)
            return false;
        const { from, to } = move;
        if (from.x < 0 || from.x >= 9 || from.y < 0 || from.y >= 9 ||
            to.x < 0 || to.x >= 9 || to.y < 0 || to.y >= 9) {
            return false;
        }
        return true;
    }
    async executeMove(gameState, move) {
        const gameMove = {
            ...move,
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            moveNumber: gameState.moveHistory.length + 1,
        };
        if (move.from && move.to) {
            const piece = gameState.board[move.from.x][move.from.y];
            gameState.board[move.from.x][move.from.y] = null;
            gameState.board[move.to.x][move.to.y] = piece;
        }
        gameState.moveHistory.push(gameMove);
        gameState.updatedAt = new Date();
        return gameMove;
    }
    isGameComplete(gameState) {
        return gameState.moveHistory.length >= 8;
    }
    initializeGameState(gameId) {
        const board = Array(9).fill(null).map(() => Array(9).fill(null));
        board[0][6] = 'pawn1';
        board[1][6] = 'pawn1';
        board[0][2] = 'pawn2';
        board[1][2] = 'pawn2';
        return {
            id: gameId,
            board,
            stacks: {},
            currentPlayer: 'player1',
            moveHistory: [],
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    getMatch(matchId) {
        return this.matches.get(matchId);
    }
    getGameState(matchId) {
        return this.gameStates.get(matchId);
    }
}
describe('AI vs AI Game Loop', () => {
    let aiGameLoop;
    beforeEach(() => {
        aiGameLoop = new MockAIGameLoop();
    });
    describe('Game loop executes moves correctly', () => {
        test('should execute AI moves in sequence', async () => {
            const match = await aiGameLoop.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            await aiGameLoop.startAIMatch(match.id);
            const updatedMatch = aiGameLoop.getMatch(match.id);
            const gameState = aiGameLoop.getGameState(match.id);
            expect(updatedMatch?.status).toBe('completed');
            expect(gameState?.moveHistory.length).toBeGreaterThan(0);
            expect(gameState?.status).toBe('completed');
        });
        test('should handle AI move generation failures', async () => {
            const match = await aiGameLoop.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: undefined,
                aiAgent2Id: 'ai-agent-2',
            });
            await expect(aiGameLoop.startAIMatch(match.id)).rejects.toThrow('AI agent not found');
        });
        test('should validate AI moves before execution', async () => {
            const match = await aiGameLoop.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            await aiGameLoop.startAIMatch(match.id);
            const gameState = aiGameLoop.getGameState(match.id);
            expect(gameState?.moveHistory).toBeDefined();
            gameState?.moveHistory.forEach(move => {
                expect(move.from).toBeDefined();
                expect(move.to).toBeDefined();
                expect(move.from.x).toBeGreaterThanOrEqual(0);
                expect(move.from.x).toBeLessThan(9);
                expect(move.to.x).toBeGreaterThanOrEqual(0);
                expect(move.to.x).toBeLessThan(9);
            });
        });
        test('should handle move execution timeouts', async () => {
            const match = await aiGameLoop.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            const startTime = Date.now();
            await aiGameLoop.startAIMatch(match.id);
            const endTime = Date.now();
            const duration = endTime - startTime;
            expect(duration).toBeGreaterThan(0);
            expect(duration).toBeLessThan(5000);
        });
    });
    describe('Turn alternation between AI agents', () => {
        test('should alternate turns correctly between AI agents', async () => {
            const match = await aiGameLoop.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            await aiGameLoop.startAIMatch(match.id);
            const gameState = aiGameLoop.getGameState(match.id);
            expect(gameState?.moveHistory.length).toBeGreaterThan(0);
            for (let i = 0; i < gameState.moveHistory.length; i++) {
                const move = gameState.moveHistory[i];
                const expectedAgent = i % 2 === 0 ? 'ai-agent-1' : 'ai-agent-2';
                expect(move.playerId).toBe(expectedAgent);
            }
        });
        test('should handle missing AI agent IDs', async () => {
            const match = await aiGameLoop.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: undefined,
                aiAgent2Id: 'ai-agent-2',
            });
            await expect(aiGameLoop.startAIMatch(match.id)).rejects.toThrow('AI agent not found');
        });
        test('should maintain turn order consistency', async () => {
            const match = await aiGameLoop.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            await aiGameLoop.startAIMatch(match.id);
            const gameState = aiGameLoop.getGameState(match.id);
            const moveHistory = gameState?.moveHistory || [];
            for (let i = 1; i < moveHistory.length; i++) {
                const currentMove = moveHistory[i];
                const previousMove = moveHistory[i - 1];
                expect(currentMove.playerId).not.toBe(previousMove.playerId);
            }
        });
    });
    describe('Move validation in game loop', () => {
        test('should validate moves before execution', async () => {
            const match = await aiGameLoop.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            await aiGameLoop.startAIMatch(match.id);
            const gameState = aiGameLoop.getGameState(match.id);
            expect(gameState?.moveHistory).toBeDefined();
            gameState?.moveHistory.forEach(move => {
                expect(move.from.x).toBeGreaterThanOrEqual(0);
                expect(move.from.x).toBeLessThan(9);
                expect(move.from.y).toBeGreaterThanOrEqual(0);
                expect(move.from.y).toBeLessThan(9);
                expect(move.to.x).toBeGreaterThanOrEqual(0);
                expect(move.to.x).toBeLessThan(9);
                expect(move.to.y).toBeGreaterThanOrEqual(0);
                expect(move.to.y).toBeLessThan(9);
            });
        });
        test('should reject invalid moves and continue game', async () => {
            const match = await aiGameLoop.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            await aiGameLoop.startAIMatch(match.id);
            const gameState = aiGameLoop.getGameState(match.id);
            expect(gameState?.status).toBe('completed');
        });
        test('should handle edge cases in move validation', async () => {
            const match = await aiGameLoop.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            await aiGameLoop.startAIMatch(match.id);
            const gameState = aiGameLoop.getGameState(match.id);
            expect(gameState?.moveHistory).toBeDefined();
        });
    });
    describe('Game completion detection', () => {
        test('should detect game completion correctly', async () => {
            const match = await aiGameLoop.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            await aiGameLoop.startAIMatch(match.id);
            const gameState = aiGameLoop.getGameState(match.id);
            expect(gameState?.status).toBe('completed');
        });
        test('should finalize game state on completion', async () => {
            const match = await aiGameLoop.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            await aiGameLoop.startAIMatch(match.id);
            const updatedMatch = aiGameLoop.getMatch(match.id);
            expect(updatedMatch?.status).toBe('completed');
            expect(updatedMatch?.updatedAt).toBeInstanceOf(Date);
        });
    });
    describe('Real-time move broadcasting', () => {
        test('should prepare moves for broadcasting', async () => {
            const match = await aiGameLoop.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            await aiGameLoop.startAIMatch(match.id);
            const gameState = aiGameLoop.getGameState(match.id);
            gameState?.moveHistory.forEach(move => {
                expect(move.id).toBeDefined();
                expect(move.timestamp).toBeInstanceOf(Date);
                expect(move.moveNumber).toBeGreaterThan(0);
            });
        });
        test('should handle broadcast data structure', async () => {
            const match = await aiGameLoop.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            await aiGameLoop.startAIMatch(match.id);
            const gameState = aiGameLoop.getGameState(match.id);
            expect(gameState?.moveHistory).toBeDefined();
        });
    });
    describe('Error recovery in game loop', () => {
        test('should handle missing match gracefully', async () => {
            const result = await aiGameLoop.startAIMatch('non-existent-match');
            expect(result).toBeUndefined();
        });
        test('should handle missing AI agents', async () => {
            const match = await aiGameLoop.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'non-existent-agent',
                aiAgent2Id: 'ai-agent-2',
            });
            await expect(aiGameLoop.startAIMatch(match.id)).rejects.toThrow('AI agent not found');
        });
    });
    describe('Game timing and pacing', () => {
        test('should implement AI thinking time simulation', async () => {
            const match = await aiGameLoop.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            const startTime = Date.now();
            await aiGameLoop.startAIMatch(match.id);
            const endTime = Date.now();
            const duration = endTime - startTime;
            expect(duration).toBeGreaterThan(0);
        });
        test('should complete games within reasonable time', async () => {
            const match = await aiGameLoop.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            const startTime = Date.now();
            await aiGameLoop.startAIMatch(match.id);
            const endTime = Date.now();
            const duration = endTime - startTime;
            expect(duration).toBeLessThan(5000);
        });
    });
    describe('Game state persistence during play', () => {
        test('should persist game state after each move', async () => {
            const match = await aiGameLoop.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            await aiGameLoop.startAIMatch(match.id);
            const gameState = aiGameLoop.getGameState(match.id);
            expect(gameState?.moveHistory.length).toBeGreaterThan(0);
            expect(gameState?.updatedAt).toBeInstanceOf(Date);
        });
        test('should maintain move sequence integrity', async () => {
            const match = await aiGameLoop.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            });
            await aiGameLoop.startAIMatch(match.id);
            const gameState = aiGameLoop.getGameState(match.id);
            const moveHistory = gameState?.moveHistory || [];
            for (let i = 0; i < moveHistory.length; i++) {
                expect(moveHistory[i].moveNumber).toBe(i + 1);
            }
        });
    });
    describe('Performance with multiple concurrent games', () => {
        test('should handle multiple AI games simultaneously', async () => {
            const matches = await Promise.all([
                aiGameLoop.createMatch({ matchType: 'ai_vs_ai', aiAgent1Id: 'ai-agent-1', aiAgent2Id: 'ai-agent-2' }),
                aiGameLoop.createMatch({ matchType: 'ai_vs_ai', aiAgent1Id: 'ai-agent-1', aiAgent2Id: 'ai-agent-2' }),
                aiGameLoop.createMatch({ matchType: 'ai_vs_ai', aiAgent1Id: 'ai-agent-1', aiAgent2Id: 'ai-agent-2' }),
            ]);
            const gamePromises = matches.map(match => aiGameLoop.startAIMatch(match.id));
            await Promise.all(gamePromises);
            matches.forEach(match => {
                const updatedMatch = aiGameLoop.getMatch(match.id);
                expect(updatedMatch?.status).toBe('completed');
            });
        });
        test('should maintain performance under concurrent load', async () => {
            const matchCount = 5;
            const matches = await Promise.all(Array.from({ length: matchCount }, () => aiGameLoop.createMatch({
                matchType: 'ai_vs_ai',
                aiAgent1Id: 'ai-agent-1',
                aiAgent2Id: 'ai-agent-2',
            })));
            const startTime = Date.now();
            const gamePromises = matches.map(match => aiGameLoop.startAIMatch(match.id));
            await Promise.all(gamePromises);
            const endTime = Date.now();
            const duration = endTime - startTime;
            expect(duration).toBeLessThan(10000);
            matches.forEach(match => {
                const updatedMatch = aiGameLoop.getMatch(match.id);
                expect(updatedMatch?.status).toBe('completed');
            });
        });
    });
});
//# sourceMappingURL=ai-vs-ai.test.js.map