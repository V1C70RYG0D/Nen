"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GungiGameEngine_1 = require("../../services/GungiGameEngine");
describe('Gungi Game Engine - Move Validation', () => {
    let gameEngine;
    beforeEach(() => {
        gameEngine = new GungiGameEngine_1.GungiGameEngine('test-move-validation');
    });
    describe('Valid move generation works for all pieces', () => {
        test('should generate valid moves for Marshal piece', () => {
            const moves = gameEngine.getValidMoves();
            const gameState = gameEngine.getGameState();
            let marshalMoves = moves.filter(move => {
                const piece = gameState.board[move.from.row][move.from.col][move.from.tier];
                return piece?.type === GungiGameEngine_1.PieceType.MARSHAL;
            });
            expect(moves.length).toBeGreaterThan(0);
            if (marshalMoves.length > 0) {
                const marshalMove = marshalMoves[0];
                expect(marshalMove.from).toBeDefined();
                expect(marshalMove.to).toBeDefined();
                expect(marshalMove.from.row).toBeGreaterThanOrEqual(0);
                expect(marshalMove.from.row).toBeLessThan(9);
            }
        });
        test('should generate valid moves for Pawn pieces', () => {
            const moves = gameEngine.getValidMoves();
            const gameState = gameEngine.getGameState();
            let pawnMoves = moves.filter(move => {
                const piece = gameState.board[move.from.row][move.from.col][move.from.tier];
                return piece?.type === GungiGameEngine_1.PieceType.PAWN;
            });
            expect(pawnMoves.length).toBeGreaterThan(0);
            pawnMoves.forEach(move => {
                if (gameState.currentPlayer === GungiGameEngine_1.Player.PLAYER_1) {
                    expect(move.to.row).toBeLessThanOrEqual(move.from.row);
                }
                else {
                    expect(move.to.row).toBeGreaterThanOrEqual(move.from.row);
                }
            });
        });
        test('should generate valid moves for General pieces', () => {
            const moves = gameEngine.getValidMoves();
            const gameState = gameEngine.getGameState();
            let generalMoves = moves.filter(move => {
                const piece = gameState.board[move.from.row][move.from.col][move.from.tier];
                return piece?.type === GungiGameEngine_1.PieceType.GENERAL;
            });
            generalMoves.forEach(move => {
                expect(move.from.row).toBeGreaterThanOrEqual(0);
                expect(move.from.row).toBeLessThan(9);
                expect(move.to.row).toBeGreaterThanOrEqual(0);
                expect(move.to.row).toBeLessThan(9);
            });
        });
        test('should generate moves for all active piece types', () => {
            const moves = gameEngine.getValidMoves();
            const gameState = gameEngine.getGameState();
            const pieceTypesWithMoves = new Set();
            moves.forEach(move => {
                const piece = gameState.board[move.from.row][move.from.col][move.from.tier];
                if (piece) {
                    pieceTypesWithMoves.add(piece.type);
                }
            });
            expect(pieceTypesWithMoves.size).toBeGreaterThan(1);
        });
        test('should only generate moves for current player', () => {
            const moves = gameEngine.getValidMoves();
            const gameState = gameEngine.getGameState();
            moves.forEach(move => {
                const piece = gameState.board[move.from.row][move.from.col][move.from.tier];
                expect(piece?.player).toBe(gameState.currentPlayer);
            });
        });
    });
    describe('Move validation prevents illegal moves', () => {
        test('should reject moves from empty squares', () => {
            const result = gameEngine.makeMove({ row: 4, col: 4, tier: 0 }, { row: 3, col: 4, tier: 0 });
            expect(result.success).toBe(false);
            expect(result.error).toContain('No piece');
        });
        test('should reject out-of-bounds moves', () => {
            const validMoves = gameEngine.getValidMoves();
            if (validMoves.length > 0) {
                const move = validMoves[0];
                const outOfBoundsResult = gameEngine.makeMove(move.from, { row: -1, col: 0, tier: 0 });
                expect(outOfBoundsResult.success).toBe(false);
                const outOfBoundsResult2 = gameEngine.makeMove(move.from, { row: 9, col: 0, tier: 0 });
                expect(outOfBoundsResult2.success).toBe(false);
                const outOfBoundsResult3 = gameEngine.makeMove(move.from, { row: 0, col: -1, tier: 0 });
                expect(outOfBoundsResult3.success).toBe(false);
                const outOfBoundsResult4 = gameEngine.makeMove(move.from, { row: 0, col: 9, tier: 0 });
                expect(outOfBoundsResult4.success).toBe(false);
            }
        });
        test('should reject moves to squares occupied by own pieces', () => {
            const gameState = gameEngine.getGameState();
            let ownPiece1 = null;
            let ownPiece2 = null;
            for (let row = 0; row < 9 && !ownPiece2; row++) {
                for (let col = 0; col < 9 && !ownPiece2; col++) {
                    const piece = gameState.board[row][col][0];
                    if (piece && piece.player === gameState.currentPlayer) {
                        if (!ownPiece1) {
                            ownPiece1 = { row, col, tier: 0 };
                        }
                        else {
                            ownPiece2 = { row, col, tier: 0 };
                        }
                    }
                }
            }
            if (ownPiece1 && ownPiece2) {
                const result = gameEngine.makeMove(ownPiece1, ownPiece2);
                expect(result.success).toBe(false);
                expect(result.error).toContain('Cannot capture own piece');
            }
        });
        test('should reject moves when not player turn', () => {
            const gameState = gameEngine.getGameState();
            let opponentPiece = null;
            const opponentPlayer = gameState.currentPlayer === GungiGameEngine_1.Player.PLAYER_1 ? GungiGameEngine_1.Player.PLAYER_2 : GungiGameEngine_1.Player.PLAYER_1;
            for (let row = 0; row < 9 && !opponentPiece; row++) {
                for (let col = 0; col < 9 && !opponentPiece; col++) {
                    const piece = gameState.board[row][col][0];
                    if (piece && piece.player === opponentPlayer) {
                        opponentPiece = { row, col, tier: 0 };
                    }
                }
            }
            if (opponentPiece) {
                const result = gameEngine.makeMove(opponentPiece, { row: 4, col: 4, tier: 0 });
                expect(result.success).toBe(false);
                expect(result.error).toContain('Not your turn');
            }
        });
        test('should reject invalid piece movement patterns', () => {
            const gameState = gameEngine.getGameState();
            let pawnPosition = null;
            for (let row = 0; row < 9 && !pawnPosition; row++) {
                for (let col = 0; col < 9 && !pawnPosition; col++) {
                    const piece = gameState.board[row][col][0];
                    if (piece && piece.type === GungiGameEngine_1.PieceType.PAWN && piece.player === gameState.currentPlayer) {
                        pawnPosition = { row, col, tier: 0 };
                    }
                }
            }
            if (pawnPosition) {
                if (gameState.currentPlayer === GungiGameEngine_1.Player.PLAYER_1 && pawnPosition.row < 8) {
                    const invalidResult = gameEngine.makeMove(pawnPosition, { row: pawnPosition.row + 1, col: pawnPosition.col, tier: 0 });
                    expect(invalidResult.success).toBe(false);
                }
                if (pawnPosition.row > 1 && pawnPosition.col > 1) {
                    const invalidResult = gameEngine.makeMove(pawnPosition, { row: pawnPosition.row - 2, col: pawnPosition.col - 2, tier: 0 });
                    expect(invalidResult.success).toBe(false);
                }
            }
        });
    });
});
//# sourceMappingURL=GungiGameEngine.moves.test.js.map