"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GungiGameEngine_1 = require("../../services/GungiGameEngine");
describe('Gungi Game Engine - Board Setup', () => {
    let gameEngine;
    beforeEach(() => {
        gameEngine = new GungiGameEngine_1.GungiGameEngine('test-board-setup');
    });
    describe('Initial board setup is correct', () => {
        test('should initialize 9x9x3 board structure correctly', () => {
            const gameState = gameEngine.getGameState();
            expect(gameState.board).toBeDefined();
            expect(gameState.board.length).toBe(9);
            expect(gameState.board[0].length).toBe(9);
            expect(gameState.board[0][0].length).toBe(3);
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    expect(gameState.board[row][col]).toBeDefined();
                    expect(Array.isArray(gameState.board[row][col])).toBe(true);
                    expect(gameState.board[row][col].length).toBe(3);
                }
            }
        });
        test('should place all required pieces for both players', () => {
            const gameState = gameEngine.getGameState();
            let player1PieceCount = 0;
            let player2PieceCount = 0;
            const pieceTypes = new Set();
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    for (let tier = 0; tier < 3; tier++) {
                        const piece = gameState.board[row][col][tier];
                        if (piece) {
                            if (piece.player === GungiGameEngine_1.Player.PLAYER_1) {
                                player1PieceCount++;
                            }
                            else {
                                player2PieceCount++;
                            }
                            pieceTypes.add(piece.type);
                        }
                    }
                }
            }
            expect(player1PieceCount).toBe(player2PieceCount);
            expect(player1PieceCount).toBeGreaterThan(20);
            expect(pieceTypes.size).toBeGreaterThan(5);
            expect(pieceTypes.has(GungiGameEngine_1.PieceType.MARSHAL)).toBe(true);
            expect(pieceTypes.has(GungiGameEngine_1.PieceType.PAWN)).toBe(true);
        });
        test('should position pieces in correct starting formation', () => {
            const gameState = gameEngine.getGameState();
            let player1BottomPieces = 0;
            let player2TopPieces = 0;
            for (let col = 0; col < 9; col++) {
                const player1BackPiece = gameState.board[8][col][0];
                if (player1BackPiece && player1BackPiece.player === GungiGameEngine_1.Player.PLAYER_1) {
                    player1BottomPieces++;
                }
                const player2BackPiece = gameState.board[0][col][0];
                if (player2BackPiece && player2BackPiece.player === GungiGameEngine_1.Player.PLAYER_2) {
                    player2TopPieces++;
                }
            }
            expect(player1BottomPieces).toBeGreaterThan(0);
            expect(player2TopPieces).toBeGreaterThan(0);
        });
        test('should ensure both players have Marshal pieces in correct positions', () => {
            const gameState = gameEngine.getGameState();
            let player1Marshal = false;
            let player2Marshal = false;
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    const piece = gameState.board[row][col][0];
                    if (piece && piece.type === GungiGameEngine_1.PieceType.MARSHAL) {
                        if (piece.player === GungiGameEngine_1.Player.PLAYER_1) {
                            player1Marshal = true;
                        }
                        else {
                            player2Marshal = true;
                        }
                    }
                }
            }
            expect(player1Marshal).toBe(true);
            expect(player2Marshal).toBe(true);
        });
        test('should initialize game state properties correctly', () => {
            const gameState = gameEngine.getGameState();
            expect(gameState.id).toBe('test-board-setup');
            expect(gameState.currentPlayer).toBe(GungiGameEngine_1.Player.PLAYER_1);
            expect(gameState.status).toBe(GungiGameEngine_1.GameStatus.ACTIVE);
            expect(gameState.moves).toEqual([]);
            expect(gameState.capturedPieces).toEqual([]);
            expect(gameState.startTime).toBeGreaterThan(0);
            expect(gameState.endTime).toBeUndefined();
            expect(gameState.winner).toBeUndefined();
        });
    });
});
//# sourceMappingURL=GungiGameEngine.setup.test.js.map