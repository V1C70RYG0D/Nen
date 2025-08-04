"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GungiGameEngine_1 = require("../../services/GungiGameEngine");
describe('Gungi Game Engine - Advanced Features', () => {
    let gameEngine;
    beforeEach(() => {
        gameEngine = new GungiGameEngine_1.GungiGameEngine('test-advanced');
    });
    describe('Board state updates correctly after moves', () => {
        test('should update piece position after successful move', () => {
            const validMoves = gameEngine.getValidMoves();
            if (validMoves.length > 0) {
                const move = validMoves[0];
                const initialState = gameEngine.getGameState();
                const initialPiece = initialState.board[move.from.row][move.from.col][move.from.tier];
                const result = gameEngine.makeMove(move.from, move.to);
                expect(result.success).toBe(true);
                const newState = gameEngine.getGameState();
                const pieceAtTo = newState.board[move.to.row][move.to.col][move.to.tier];
                const pieceAtFrom = newState.board[move.from.row][move.from.col][move.from.tier];
                expect(pieceAtFrom).toBeNull();
                expect(pieceAtTo).toEqual(initialPiece);
            }
        });
        test('should switch current player after move', () => {
            const initialPlayer = gameEngine.getGameState().currentPlayer;
            const validMoves = gameEngine.getValidMoves();
            if (validMoves.length > 0) {
                const move = validMoves[0];
                gameEngine.makeMove(move.from, move.to);
                const newPlayer = gameEngine.getGameState().currentPlayer;
                expect(newPlayer).not.toBe(initialPlayer);
            }
        });
        test('should record move in game history', () => {
            const initialMoveCount = gameEngine.getGameState().moves.length;
            const validMoves = gameEngine.getValidMoves();
            if (validMoves.length > 0) {
                const move = validMoves[0];
                gameEngine.makeMove(move.from, move.to);
                const newMoveCount = gameEngine.getGameState().moves.length;
                expect(newMoveCount).toBe(initialMoveCount + 1);
                const lastMove = gameEngine.getGameState().moves[newMoveCount - 1];
                expect(lastMove.from).toEqual(move.from);
                expect(lastMove.to).toEqual(move.to);
            }
        });
    });
    describe('Piece stacking rules (Tsuke mechanics)', () => {
        test('should allow stacking pieces when appropriate', () => {
            const gameState = gameEngine.getGameState();
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    expect(gameState.board[row][col].length).toBe(3);
                    for (let tier = 0; tier < 3; tier++) {
                        expect(gameState.board[row][col][tier] === null || typeof gameState.board[row][col][tier] === 'object').toBe(true);
                    }
                }
            }
        });
        test('should maintain proper tier ordering', () => {
            const gameState = gameEngine.getGameState();
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    const tiers = gameState.board[row][col];
                    if (tiers[1] !== null) {
                        expect(tiers[0]).not.toBeNull();
                    }
                    if (tiers[2] !== null) {
                        expect(tiers[0]).not.toBeNull();
                        expect(tiers[1]).not.toBeNull();
                    }
                }
            }
        });
    });
    describe('Win condition detection (Marshal capture)', () => {
        test('should detect when game is in active state initially', () => {
            const gameState = gameEngine.getGameState();
            expect(gameState.status).toBe(GungiGameEngine_1.GameStatus.ACTIVE);
            expect(gameState.result).toBe(GungiGameEngine_1.GameResult.ONGOING);
            expect(gameState.winner).toBeUndefined();
        });
        test('should maintain active status during normal gameplay', () => {
            const validMoves = gameEngine.getValidMoves();
            if (validMoves.length > 0) {
                const move = validMoves[0];
                gameEngine.makeMove(move.from, move.to);
                const gameState = gameEngine.getGameState();
                expect(gameState.status).toBe(GungiGameEngine_1.GameStatus.ACTIVE);
            }
        });
    });
    describe('Game history tracking and accuracy', () => {
        test('should track complete move sequence', () => {
            const validMoves = gameEngine.getValidMoves();
            const moveSequence = [];
            for (let i = 0; i < Math.min(3, validMoves.length); i++) {
                const currentMoves = gameEngine.getValidMoves();
                if (currentMoves.length > 0) {
                    const move = currentMoves[0];
                    const result = gameEngine.makeMove(move.from, move.to);
                    if (result.success) {
                        moveSequence.push(move);
                    }
                }
            }
            const gameState = gameEngine.getGameState();
            expect(gameState.moves.length).toBe(moveSequence.length);
        });
        test('should maintain chronological order in move history', () => {
            const validMoves = gameEngine.getValidMoves();
            if (validMoves.length > 0) {
                const move = validMoves[0];
                const initialTime = Date.now();
                gameEngine.makeMove(move.from, move.to);
                const gameState = gameEngine.getGameState();
                if (gameState.moves.length > 0) {
                    const lastMove = gameState.moves[gameState.moves.length - 1];
                    expect(lastMove.timestamp).toBeGreaterThanOrEqual(initialTime);
                }
            }
        });
    });
    describe('Board serialization/deserialization', () => {
        test('should export valid JSON', () => {
            const serialized = gameEngine.exportGameState();
            expect(typeof serialized).toBe('string');
            expect(serialized.length).toBeGreaterThan(0);
            expect(() => JSON.parse(serialized)).not.toThrow();
            const parsed = JSON.parse(serialized);
            expect(parsed.id).toBeDefined();
            expect(parsed.board).toBeDefined();
            expect(parsed.currentPlayer).toBeDefined();
        });
        test('should import exported state correctly', () => {
            const originalState = gameEngine.getGameState();
            const serialized = gameEngine.exportGameState();
            const newEngine = new GungiGameEngine_1.GungiGameEngine('test-import');
            const importResult = newEngine.importGameState(serialized);
            expect(importResult).toBe(true);
            const importedState = newEngine.getGameState();
            expect(importedState.currentPlayer).toBe(originalState.currentPlayer);
            expect(importedState.status).toBe(originalState.status);
            expect(importedState.moves.length).toBe(originalState.moves.length);
        });
        test('should preserve board state across serialization', () => {
            const validMoves = gameEngine.getValidMoves();
            if (validMoves.length > 0) {
                const move = validMoves[0];
                gameEngine.makeMove(move.from, move.to);
            }
            const serialized = gameEngine.exportGameState();
            const newEngine = new GungiGameEngine_1.GungiGameEngine('test-preserve');
            newEngine.importGameState(serialized);
            const originalState = gameEngine.getGameState();
            const importedState = newEngine.getGameState();
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    for (let tier = 0; tier < 3; tier++) {
                        const originalPiece = originalState.board[row][col][tier];
                        const importedPiece = importedState.board[row][col][tier];
                        if (originalPiece === null) {
                            expect(importedPiece).toBeNull();
                        }
                        else {
                            expect(importedPiece).toEqual(originalPiece);
                        }
                    }
                }
            }
        });
    });
    describe('Performance testing with complex states', () => {
        test('should handle rapid move generation efficiently', () => {
            const startTime = Date.now();
            for (let i = 0; i < 100; i++) {
                gameEngine.getValidMoves();
            }
            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(1000);
        });
        test('should handle multiple serialization operations efficiently', () => {
            const startTime = Date.now();
            for (let i = 0; i < 50; i++) {
                gameEngine.exportGameState();
            }
            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(500);
        });
        test('should maintain consistent performance with board state queries', () => {
            const iterations = 100;
            const times = [];
            for (let i = 0; i < iterations; i++) {
                const start = Date.now();
                gameEngine.getGameState();
                const end = Date.now();
                times.push(end - start);
            }
            const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
            expect(averageTime).toBeLessThan(5);
        });
    });
    describe('Edge cases and corner scenarios', () => {
        test('should handle invalid JSON gracefully during import', () => {
            const invalidJson = '{"invalid": "json"}';
            const result = gameEngine.importGameState(invalidJson);
            expect(result).toBe(false);
        });
        test('should handle empty move sequences', () => {
            const gameState = gameEngine.getGameState();
            expect(gameState.moves).toEqual([]);
            expect(gameState.moves.length).toBe(0);
        });
        test('should handle position queries at board boundaries', () => {
            const gameState = gameEngine.getGameState();
            expect(gameState.board[0][0]).toBeDefined();
            expect(gameState.board[0][8]).toBeDefined();
            expect(gameState.board[8][0]).toBeDefined();
            expect(gameState.board[8][8]).toBeDefined();
        });
        test('should validate board representation consistently', () => {
            const representation = gameEngine.getBoardRepresentation();
            expect(Array.isArray(representation)).toBe(true);
            expect(representation.length).toBe(9);
            representation.forEach(row => {
                expect(Array.isArray(row)).toBe(true);
                expect(row.length).toBe(9);
            });
        });
        test('should handle game state validation for moves', () => {
            const gameState = gameEngine.getGameState();
            expect(gameState.status).toBe(GungiGameEngine_1.GameStatus.ACTIVE);
            const validMoves = gameEngine.getValidMoves();
            if (validMoves.length > 0) {
                const move = validMoves[0];
                const result = gameEngine.makeMove(move.from, move.to);
                expect(result.success).toBe(true);
            }
            expect(typeof gameState.status).toBe('string');
            expect(typeof gameState.result).toBe('string');
        });
    });
});
//# sourceMappingURL=GungiGameEngine.advanced.test.js.map