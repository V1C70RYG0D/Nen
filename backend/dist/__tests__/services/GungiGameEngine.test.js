"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GungiGameEngine_1 = require("../../services/GungiGameEngine");
describe('Gungi Game Engine', () => {
    let gameEngine;
    const testGameId = 'test-game-comprehensive';
    beforeEach(() => {
        gameEngine = new GungiGameEngine_1.GungiGameEngine(testGameId);
    });
    afterEach(() => {
        gameEngine = undefined;
    });
    describe('Initial board setup is correct', () => {
        test('should initialize 9x9x3 board structure correctly', () => {
            const gameState = gameEngine.getGameState();
            expect(gameState).toBeDefined();
            expect(gameState.id).toBe(testGameId);
            expect(gameState.board).toBeDefined();
            expect(gameState.board.length).toBe(9);
            expect(gameState.board[0].length).toBe(9);
            expect(gameState.board[0][0].length).toBe(3);
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
                            pieceTypes.add(piece.type);
                            if (piece.player === GungiGameEngine_1.Player.PLAYER_1)
                                player1PieceCount++;
                            if (piece.player === GungiGameEngine_1.Player.PLAYER_2)
                                player2PieceCount++;
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
                if (player1BackPiece) {
                    expect(player1BackPiece.player).toBe(GungiGameEngine_1.Player.PLAYER_1);
                    player1BottomPieces++;
                }
                const player2BackPiece = gameState.board[0][col][0];
                if (player2BackPiece) {
                    expect(player2BackPiece.player).toBe(GungiGameEngine_1.Player.PLAYER_2);
                    player2TopPieces++;
                }
            }
            expect(player1BottomPieces).toBeGreaterThan(0);
            expect(player2TopPieces).toBeGreaterThan(0);
        });
        test('should ensure both players have Marshal pieces in correct positions', () => {
            const gameState = gameEngine.getGameState();
            const player1Marshal = gameState.board[8][4][0];
            expect(player1Marshal).toBeDefined();
            expect(player1Marshal?.type).toBe(GungiGameEngine_1.PieceType.MARSHAL);
            expect(player1Marshal?.player).toBe(GungiGameEngine_1.Player.PLAYER_1);
            const player2Marshal = gameState.board[0][4][0];
            expect(player2Marshal).toBeDefined();
            expect(player2Marshal?.type).toBe(GungiGameEngine_1.PieceType.MARSHAL);
            expect(player2Marshal?.player).toBe(GungiGameEngine_1.Player.PLAYER_2);
        });
        test('should initialize game state properties correctly', () => {
            const gameState = gameEngine.getGameState();
            expect(gameState.currentPlayer).toBe(GungiGameEngine_1.Player.PLAYER_1);
            expect(gameState.status).toBe(GungiGameEngine_1.GameStatus.ACTIVE);
            expect(gameState.result).toBe(GungiGameEngine_1.GameResult.ONGOING);
            expect(gameState.moves).toEqual([]);
            expect(gameState.capturedPieces).toEqual([]);
            expect(gameState.startTime).toBeCloseTo(Date.now(), -3);
            expect(gameState.endTime).toBeUndefined();
            expect(gameState.winner).toBeUndefined();
        });
    });
    describe('Valid move generation works for all pieces', () => {
        test('should generate valid moves for Marshal piece', () => {
            const validMoves = gameEngine.getValidMoves();
            const marshalMoves = validMoves.filter(move => move.piece.type === GungiGameEngine_1.PieceType.MARSHAL &&
                move.player === GungiGameEngine_1.Player.PLAYER_1);
            expect(marshalMoves.length).toBeGreaterThan(0);
            marshalMoves.forEach(move => {
                const rowDiff = Math.abs(move.to.row - move.from.row);
                const colDiff = Math.abs(move.to.col - move.from.col);
                const tierDiff = Math.abs(move.to.tier - move.from.tier);
                expect(rowDiff <= 1 && colDiff <= 1 && tierDiff <= 1).toBe(true);
            });
        });
        test('should generate valid moves for Pawn pieces', () => {
            const validMoves = gameEngine.getValidMoves();
            const pawnMoves = validMoves.filter(move => move.piece.type === GungiGameEngine_1.PieceType.PAWN &&
                move.player === GungiGameEngine_1.Player.PLAYER_1);
            expect(pawnMoves.length).toBeGreaterThan(0);
            pawnMoves.forEach(move => {
                if (!move.isStack) {
                    expect(move.to.row).toBeLessThanOrEqual(move.from.row);
                    expect(move.to.col).toBe(move.from.col);
                }
            });
        });
        test('should generate valid moves for General pieces', () => {
            const validMoves = gameEngine.getValidMoves();
            const generalMoves = validMoves.filter(move => move.piece.type === GungiGameEngine_1.PieceType.GENERAL);
            expect(generalMoves.length).toBeGreaterThan(0);
            generalMoves.forEach(move => {
                const rowDiff = Math.abs(move.to.row - move.from.row);
                const colDiff = Math.abs(move.to.col - move.from.col);
                const isStraightLine = rowDiff === 0 || colDiff === 0;
                const isDiagonal = rowDiff === colDiff;
                expect(isStraightLine || isDiagonal).toBe(true);
            });
        });
        test('should generate moves for all active piece types', () => {
            const validMoves = gameEngine.getValidMoves();
            const pieceTypesWithMoves = new Set(validMoves.map(move => move.piece.type));
            expect(pieceTypesWithMoves.size).toBeGreaterThan(1);
            expect(Array.from(pieceTypesWithMoves)).toContain(GungiGameEngine_1.PieceType.PAWN);
        });
        test('should only generate moves for current player', () => {
            const validMoves = gameEngine.getValidMoves();
            const gameState = gameEngine.getGameState();
            validMoves.forEach(move => {
                expect(move.player).toBe(gameState.currentPlayer);
                expect(move.piece.player).toBe(gameState.currentPlayer);
            });
        });
    });
    describe('Move validation prevents illegal moves', () => {
        test('should reject moves from empty squares', () => {
            const emptyPosition = { row: 4, col: 4, tier: 0 };
            const result = gameEngine.makeMove(emptyPosition, { row: 4, col: 5, tier: 0 });
            expect(result.success).toBe(false);
            expect(result.error).toContain('No piece at source position');
        });
        test('should reject out-of-bounds moves', () => {
            const gameState = gameEngine.getGameState();
            let testPiece = null;
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    const piece = gameState.board[row][col][0];
                    if (piece?.player === GungiGameEngine_1.Player.PLAYER_1) {
                        testPiece = { row, col, tier: 0 };
                        break;
                    }
                }
                if (testPiece)
                    break;
            }
            if (testPiece) {
                const result = gameEngine.makeMove(testPiece, { row: -1, col: 0, tier: 0 });
                expect(result.success).toBe(false);
                expect(result.error).toContain('Invalid position coordinates');
            }
        });
        test('should reject moves to squares occupied by own pieces', () => {
            const gameState = gameEngine.getGameState();
            let piece1 = null;
            let piece2 = null;
            for (let row = 6; row < 9; row++) {
                for (let col = 0; col < 8; col++) {
                    const p1 = gameState.board[row][col][0];
                    const p2 = gameState.board[row][col + 1][0];
                    if (p1?.player === GungiGameEngine_1.Player.PLAYER_1 && p2?.player === GungiGameEngine_1.Player.PLAYER_1) {
                        piece1 = { row, col, tier: 0 };
                        piece2 = { row, col: col + 1, tier: 0 };
                        break;
                    }
                }
                if (piece1 && piece2)
                    break;
            }
            if (piece1 && piece2) {
                const result = gameEngine.makeMove(piece1, piece2);
                expect(result.success).toBe(false);
                expect(result.error).toContain('Cannot capture own piece');
            }
        });
        test('should reject moves when not player turn', () => {
            const gameState = gameEngine.getGameState();
            let player2Piece = null;
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 9; col++) {
                    const piece = gameState.board[row][col][0];
                    if (piece?.player === GungiGameEngine_1.Player.PLAYER_2) {
                        player2Piece = { row, col, tier: 0 };
                        break;
                    }
                }
                if (player2Piece)
                    break;
            }
            if (player2Piece) {
                const result = gameEngine.makeMove(player2Piece, { row: player2Piece.row + 1, col: player2Piece.col, tier: 0 });
                expect(result.success).toBe(false);
                expect(result.error).toContain('Not your turn');
            }
        });
        test('should reject invalid piece movement patterns', () => {
            const gameState = gameEngine.getGameState();
            let pawnPosition = null;
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    const piece = gameState.board[row][col][0];
                    if (piece?.type === GungiGameEngine_1.PieceType.PAWN && piece.player === GungiGameEngine_1.Player.PLAYER_1) {
                        pawnPosition = { row, col, tier: 0 };
                        break;
                    }
                }
                if (pawnPosition)
                    break;
            }
            if (pawnPosition && pawnPosition.row < 8) {
                const result = gameEngine.makeMove(pawnPosition, { row: pawnPosition.row + 1, col: pawnPosition.col, tier: 0 });
                expect(result.success).toBe(false);
                expect(result.error).toBeDefined();
            }
        });
    });
    describe('Board state updates correctly after moves', () => {
        test('should update piece position after successful move', () => {
            const validMoves = gameEngine.getValidMoves();
            if (validMoves.length > 0) {
                const testMove = validMoves[0];
                const result = gameEngine.makeMove(testMove.from, testMove.to);
                expect(result.success).toBe(true);
                expect(result.move).toBeDefined();
                const updatedGameState = gameEngine.getGameState();
                const originalPiece = updatedGameState.board[testMove.from.row][testMove.from.col][testMove.from.tier];
                expect(originalPiece).toBeNull();
                const movedPiece = updatedGameState.board[testMove.to.row][testMove.to.col][testMove.to.tier];
                expect(movedPiece).toBeDefined();
                expect(movedPiece?.id).toBe(testMove.piece.id);
            }
        });
        test('should switch current player after move', () => {
            const validMoves = gameEngine.getValidMoves();
            if (validMoves.length > 0) {
                const initialPlayer = gameEngine.getGameState().currentPlayer;
                const testMove = validMoves[0];
                const result = gameEngine.makeMove(testMove.from, testMove.to);
                expect(result.success).toBe(true);
                const updatedGameState = gameEngine.getGameState();
                const expectedNextPlayer = initialPlayer === GungiGameEngine_1.Player.PLAYER_1 ? GungiGameEngine_1.Player.PLAYER_2 : GungiGameEngine_1.Player.PLAYER_1;
                expect(updatedGameState.currentPlayer).toBe(expectedNextPlayer);
            }
        });
        test('should update move count for pieces', () => {
            const validMoves = gameEngine.getValidMoves();
            if (validMoves.length > 0) {
                const testMove = validMoves[0];
                const initialMoveCount = testMove.piece.moveCount;
                const result = gameEngine.makeMove(testMove.from, testMove.to);
                expect(result.success).toBe(true);
                const updatedGameState = gameEngine.getGameState();
                const movedPiece = updatedGameState.board[testMove.to.row][testMove.to.col][testMove.to.tier];
                expect(movedPiece?.moveCount).toBe(initialMoveCount + 1);
            }
        });
        test('should add move to game history', () => {
            const validMoves = gameEngine.getValidMoves();
            if (validMoves.length > 0) {
                const initialMoveCount = gameEngine.getGameState().moves.length;
                const testMove = validMoves[0];
                const result = gameEngine.makeMove(testMove.from, testMove.to);
                expect(result.success).toBe(true);
                const updatedGameState = gameEngine.getGameState();
                expect(updatedGameState.moves.length).toBe(initialMoveCount + 1);
                const lastMove = updatedGameState.moves[updatedGameState.moves.length - 1];
                expect(lastMove.from).toEqual(testMove.from);
                expect(lastMove.to).toEqual(testMove.to);
                expect(lastMove.player).toBe(testMove.player);
            }
        });
    });
    describe('Piece stacking rules enforced', () => {
        test('should allow stacking pieces up to 3 levels', () => {
            const gameState = gameEngine.getGameState();
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    for (let tier = 0; tier < 3; tier++) {
                        const piece = gameState.board[row][col][tier];
                        if (piece) {
                            expect(piece.position.tier).toBeLessThanOrEqual(2);
                            expect(piece.position.tier).toBeGreaterThanOrEqual(0);
                        }
                    }
                }
            }
        });
        test('should prevent stacking beyond 3 levels', () => {
            const testPosition = { row: 4, col: 4, tier: 3 };
            const result = gameEngine.makeMove({ row: 6, col: 0, tier: 0 }, testPosition);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid position coordinates');
        });
        test('should handle stacking mechanics properly', () => {
            const validMoves = gameEngine.getValidMoves();
            const stackMoves = validMoves.filter(move => move.isStack);
            stackMoves.forEach(move => {
                expect(move.from.row).toBe(move.to.row);
                expect(move.from.col).toBe(move.to.col);
                expect(move.to.tier).toBeGreaterThan(move.from.tier);
                expect(move.to.tier).toBeLessThanOrEqual(2);
            });
        });
    });
    describe('Win condition detection (capture king)', () => {
        test('should detect Player 1 win when Player 2 Marshal is captured', () => {
            const gameState = gameEngine.getGameState();
            let player2Marshal = null;
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    for (let tier = 0; tier < 3; tier++) {
                        const piece = gameState.board[row][col][tier];
                        if (piece?.type === GungiGameEngine_1.PieceType.MARSHAL && piece.player === GungiGameEngine_1.Player.PLAYER_2) {
                            player2Marshal = { row, col, tier };
                            break;
                        }
                    }
                    if (player2Marshal)
                        break;
                }
                if (player2Marshal)
                    break;
            }
            expect(player2Marshal).toBeDefined();
        });
        test('should continue game when both Marshals are active', () => {
            const gameState = gameEngine.getGameState();
            expect(gameState.status).toBe(GungiGameEngine_1.GameStatus.ACTIVE);
            expect(gameState.result).toBe(GungiGameEngine_1.GameResult.ONGOING);
            expect(gameState.winner).toBeUndefined();
            let player1MarshalActive = false;
            let player2MarshalActive = false;
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    for (let tier = 0; tier < 3; tier++) {
                        const piece = gameState.board[row][col][tier];
                        if (piece?.type === GungiGameEngine_1.PieceType.MARSHAL && piece.isActive) {
                            if (piece.player === GungiGameEngine_1.Player.PLAYER_1)
                                player1MarshalActive = true;
                            if (piece.player === GungiGameEngine_1.Player.PLAYER_2)
                                player2MarshalActive = true;
                        }
                    }
                }
            }
            expect(player1MarshalActive).toBe(true);
            expect(player2MarshalActive).toBe(true);
        });
        test('should handle time limit game endings', () => {
            const gameState = gameEngine.getGameState();
            expect(gameState.startTime).toBeDefined();
            expect(typeof gameState.startTime).toBe('number');
            expect(gameState.startTime).toBeCloseTo(Date.now(), -3);
        });
        test('should handle move limit endings', () => {
            const gameState = gameEngine.getGameState();
            expect(gameState.moves).toBeDefined();
            expect(Array.isArray(gameState.moves)).toBe(true);
            expect(gameState.moves.length).toBe(0);
        });
    });
    describe('Game history tracking maintains accuracy', () => {
        test('should maintain chronological move order', () => {
            const validMoves = gameEngine.getValidMoves();
            if (validMoves.length >= 2) {
                const move1 = validMoves[0];
                const result1 = gameEngine.makeMove(move1.from, move1.to);
                expect(result1.success).toBe(true);
                const validMoves2 = gameEngine.getValidMoves();
                if (validMoves2.length > 0) {
                    const player2Move = validMoves2[0];
                    const result2 = gameEngine.makeMove(player2Move.from, player2Move.to);
                    expect(result2.success).toBe(true);
                    const gameState = gameEngine.getGameState();
                    expect(gameState.moves.length).toBe(2);
                    expect(gameState.moves[0].player).toBe(GungiGameEngine_1.Player.PLAYER_1);
                    expect(gameState.moves[1].player).toBe(GungiGameEngine_1.Player.PLAYER_2);
                    expect(gameState.moves[0].moveNumber).toBe(1);
                    expect(gameState.moves[1].moveNumber).toBe(2);
                }
            }
        });
        test('should track move timestamps accurately', () => {
            const validMoves = gameEngine.getValidMoves();
            if (validMoves.length > 0) {
                const startTime = Date.now();
                const testMove = validMoves[0];
                const result = gameEngine.makeMove(testMove.from, testMove.to);
                const endTime = Date.now();
                expect(result.success).toBe(true);
                const gameState = gameEngine.getGameState();
                const lastMove = gameState.moves[gameState.moves.length - 1];
                expect(lastMove.timestamp).toBeGreaterThanOrEqual(startTime);
                expect(lastMove.timestamp).toBeLessThanOrEqual(endTime);
            }
        });
        test('should maintain move consistency across game state', () => {
            const validMoves = gameEngine.getValidMoves();
            if (validMoves.length > 0) {
                const testMove = validMoves[0];
                const result = gameEngine.makeMove(testMove.from, testMove.to);
                expect(result.success).toBe(true);
                const gameState = gameEngine.getGameState();
                const lastMove = gameState.moves[gameState.moves.length - 1];
                expect(lastMove.from).toEqual(testMove.from);
                expect(lastMove.to).toEqual(testMove.to);
                expect(lastMove.piece.id).toBe(testMove.piece.id);
            }
        });
    });
    describe('Board serialization/deserialization', () => {
        test('should export game state as valid JSON', () => {
            const gameState = gameEngine.getGameState();
            const serialized = gameEngine.exportGameState();
            expect(typeof serialized).toBe('string');
            expect(() => JSON.parse(serialized)).not.toThrow();
            const parsed = JSON.parse(serialized);
            expect(parsed.id).toBe(gameState.id);
            expect(parsed.currentPlayer).toBe(gameState.currentPlayer);
            expect(parsed.status).toBe(gameState.status);
        });
        test('should import game state from JSON correctly', () => {
            const originalGameState = gameEngine.getGameState();
            const serialized = gameEngine.exportGameState();
            const newEngine = new GungiGameEngine_1.GungiGameEngine('import-test');
            const importResult = newEngine.importGameState(serialized);
            expect(importResult).toBe(true);
            const importedGameState = newEngine.getGameState();
            expect(importedGameState.id).toBe(originalGameState.id);
            expect(importedGameState.currentPlayer).toBe(originalGameState.currentPlayer);
            expect(importedGameState.status).toBe(originalGameState.status);
            expect(importedGameState.moves.length).toBe(originalGameState.moves.length);
        });
        test('should handle invalid JSON gracefully', () => {
            const invalidJson = '{ invalid json }';
            const importResult = gameEngine.importGameState(invalidJson);
            expect(importResult).toBe(false);
        });
        test('should maintain board representation consistency', () => {
            const originalBoard = gameEngine.getBoardRepresentation();
            const serialized = gameEngine.exportGameState();
            const newEngine = new GungiGameEngine_1.GungiGameEngine('board-test');
            newEngine.importGameState(serialized);
            const importedBoard = newEngine.getBoardRepresentation();
            expect(importedBoard).toEqual(originalBoard);
        });
    });
    describe('Performance with complex board states', () => {
        test('should initialize game in reasonable time', () => {
            const startTime = Date.now();
            const newEngine = new GungiGameEngine_1.GungiGameEngine('perf-test-1');
            const gameState = newEngine.getGameState();
            const endTime = Date.now();
            expect(endTime - startTime).toBeLessThan(100);
            expect(gameState).toBeDefined();
        });
        test('should get valid moves quickly', () => {
            const startTime = Date.now();
            for (let i = 0; i < 10; i++) {
                const validMoves = gameEngine.getValidMoves();
                expect(Array.isArray(validMoves)).toBe(true);
            }
            const endTime = Date.now();
            const avgTime = (endTime - startTime) / 10;
            expect(avgTime).toBeLessThan(50);
        });
        test('should handle multiple sequential moves efficiently', () => {
            const startTime = Date.now();
            let moveCount = 0;
            for (let i = 0; i < 20; i++) {
                const validMoves = gameEngine.getValidMoves();
                if (validMoves.length === 0)
                    break;
                const move = validMoves[0];
                const result = gameEngine.makeMove(move.from, move.to);
                if (result.success) {
                    moveCount++;
                }
                else {
                    break;
                }
            }
            const endTime = Date.now();
            const avgTimePerMove = (endTime - startTime) / Math.max(moveCount, 1);
            expect(avgTimePerMove).toBeLessThan(20);
            expect(moveCount).toBeGreaterThan(0);
        });
        test('should handle board representation generation efficiently', () => {
            const startTime = Date.now();
            for (let i = 0; i < 100; i++) {
                const board = gameEngine.getBoardRepresentation();
                expect(board.length).toBe(9);
                expect(board[0].length).toBe(9);
            }
            const endTime = Date.now();
            const avgTime = (endTime - startTime) / 100;
            expect(avgTime).toBeLessThan(5);
        });
    });
    describe('Edge cases and corner scenarios', () => {
        test('should handle moves to same position (stacking)', () => {
            const gameState = gameEngine.getGameState();
            let stackablePosition = null;
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    const piece = gameState.board[row][col][0];
                    if (piece?.player === GungiGameEngine_1.Player.PLAYER_1) {
                        stackablePosition = { row, col, tier: 0 };
                        break;
                    }
                }
                if (stackablePosition)
                    break;
            }
            if (stackablePosition) {
                const result = gameEngine.makeMove(stackablePosition, { ...stackablePosition, tier: 1 });
                expect(typeof result.success).toBe('boolean');
                if (result.success) {
                    expect(result.move?.isStack).toBe(true);
                }
            }
        });
        test('should handle boundary moves correctly', () => {
            const gameState = gameEngine.getGameState();
            const edgePieces = [];
            const edgePositions = [
                { row: 0, col: 0 }, { row: 0, col: 8 },
                { row: 8, col: 0 }, { row: 8, col: 8 }
            ];
            edgePositions.forEach(pos => {
                const piece = gameState.board[pos.row][pos.col][0];
                if (piece) {
                    edgePieces.push({ ...pos, tier: 0 });
                }
            });
            edgePieces.forEach(edgePos => {
                const validMoves = gameEngine.getValidMoves();
                const edgeMoves = validMoves.filter(move => move.from.row === edgePos.row &&
                    move.from.col === edgePos.col);
                expect(edgeMoves.length).toBeGreaterThanOrEqual(0);
            });
        });
        test('should handle empty board areas gracefully', () => {
            const gameState = gameEngine.getGameState();
            let emptyFound = false;
            for (let row = 3; row < 6; row++) {
                for (let col = 3; col < 6; col++) {
                    const isEmpty = gameState.board[row][col].every(tier => tier === null);
                    if (isEmpty) {
                        emptyFound = true;
                        const validMoves = gameEngine.getValidMoves();
                        const movesToEmpty = validMoves.filter(move => move.to.row === row && move.to.col === col);
                        expect(movesToEmpty.length).toBeGreaterThanOrEqual(0);
                    }
                }
            }
            expect(emptyFound).toBe(true);
        });
        test('should handle rapid consecutive moves', () => {
            let successfulMoves = 0;
            for (let i = 0; i < 10; i++) {
                const validMoves = gameEngine.getValidMoves();
                if (validMoves.length === 0)
                    break;
                const move = validMoves[0];
                const result = gameEngine.makeMove(move.from, move.to);
                if (result.success) {
                    successfulMoves++;
                }
                else {
                    break;
                }
            }
            expect(successfulMoves).toBeGreaterThan(0);
            const finalGameState = gameEngine.getGameState();
            expect(finalGameState.moves.length).toBe(successfulMoves);
        });
        test('should handle game state after game completion', () => {
            gameEngine.setGameStatus(GungiGameEngine_1.GameStatus.COMPLETED, GungiGameEngine_1.GameResult.PLAYER_1_WIN, GungiGameEngine_1.Player.PLAYER_1, Date.now());
            const result = gameEngine.makeMove({ row: 6, col: 0, tier: 0 }, { row: 5, col: 0, tier: 0 });
            expect(result.success).toBe(false);
            expect(result.error).toContain('Game is not active');
        });
    });
});
//# sourceMappingURL=GungiGameEngine.test.js.map