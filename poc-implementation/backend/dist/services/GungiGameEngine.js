"use strict";
/**
 * Gungi Game Engine - Core Implementation
 *
 * Based on Hunter x Hunter Gungi rules:
 * - 9x9 board with coordinate system
 * - 3-tier stacking mechanics (Tsuke)
 * - 13 unique piece types with complex movements
 * - Goal: Capture the opposing Marshal (King)
 *
 * This is the foundational game engine for the POC.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GungiGameEngine = exports.GameResult = exports.GameStatus = exports.Player = exports.PieceType = void 0;
const zod_1 = require("zod");
// ==========================================
// TYPE DEFINITIONS
// ==========================================
var PieceType;
(function (PieceType) {
    PieceType["MARSHAL"] = "marshal";
    PieceType["GENERAL"] = "general";
    PieceType["LIEUTENANT"] = "lieutenant";
    PieceType["MAJOR"] = "major";
    PieceType["MINOR"] = "minor";
    PieceType["SHINOBI"] = "shinobi";
    PieceType["BOW"] = "bow";
    PieceType["CANNON"] = "cannon";
    PieceType["FORT"] = "fort";
    PieceType["PAWN"] = "pawn";
    PieceType["FORTRESS"] = "fortress";
    PieceType["LANCE"] = "lance";
    PieceType["SPY"] = "spy"; // Information gatherer
})(PieceType || (exports.PieceType = PieceType = {}));
var Player;
(function (Player) {
    Player[Player["PLAYER_1"] = 1] = "PLAYER_1";
    Player[Player["PLAYER_2"] = 2] = "PLAYER_2";
})(Player || (exports.Player = Player = {}));
var GameStatus;
(function (GameStatus) {
    GameStatus["PENDING"] = "pending";
    GameStatus["ACTIVE"] = "active";
    GameStatus["COMPLETED"] = "completed";
    GameStatus["CANCELLED"] = "cancelled";
})(GameStatus || (exports.GameStatus = GameStatus = {}));
var GameResult;
(function (GameResult) {
    GameResult["PLAYER_1_WIN"] = "player1_win";
    GameResult["PLAYER_2_WIN"] = "player2_win";
    GameResult["DRAW"] = "draw";
    GameResult["STALEMATE"] = "stalemate";
    GameResult["TIME_LIMIT"] = "time_limit";
    GameResult["MOVE_LIMIT"] = "move_limit";
    GameResult["ONGOING"] = "ongoing";
})(GameResult || (exports.GameResult = GameResult = {}));
// ==========================================
// VALIDATION SCHEMAS
// ==========================================
const PositionSchema = zod_1.z.object({
    row: zod_1.z.number().min(0).max(8),
    col: zod_1.z.number().min(0).max(8),
    tier: zod_1.z.number().min(0).max(2)
});
const PieceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.nativeEnum(PieceType),
    player: zod_1.z.nativeEnum(Player),
    position: PositionSchema,
    isActive: zod_1.z.boolean(),
    moveCount: zod_1.z.number().min(0)
});
const MoveSchema = zod_1.z.object({
    id: zod_1.z.string(),
    player: zod_1.z.nativeEnum(Player),
    piece: PieceSchema,
    from: PositionSchema,
    to: PositionSchema,
    capturedPiece: PieceSchema.optional(),
    isCapture: zod_1.z.boolean(),
    isStack: zod_1.z.boolean(),
    timestamp: zod_1.z.number(),
    moveNumber: zod_1.z.number().min(1)
});
const GameStateSchema = zod_1.z.object({
    id: zod_1.z.string(),
    board: zod_1.z.array(zod_1.z.array(zod_1.z.array(PieceSchema.nullable()))).length(9),
    currentPlayer: zod_1.z.nativeEnum(Player),
    status: zod_1.z.nativeEnum(GameStatus),
    result: zod_1.z.nativeEnum(GameResult),
    moves: zod_1.z.array(MoveSchema),
    capturedPieces: zod_1.z.array(PieceSchema),
    startTime: zod_1.z.number(),
    endTime: zod_1.z.number().optional(),
    winner: zod_1.z.nativeEnum(Player).optional()
});
// ==========================================
// GUNGI GAME ENGINE CLASS
// ==========================================
class GungiGameEngine {
    constructor(gameId) {
        this.gameState = this.initializeGame(gameId);
    }
    /**
     * Initialize a new Gungi game with starting positions
     */
    initializeGame(gameId) {
        const board = Array(9).fill(null).map(() => Array(9).fill(null).map(() => Array(3).fill(null)));
        const pieces = this.createInitialPieces();
        // Place pieces on board
        pieces.forEach(piece => {
            const { row, col, tier } = piece.position;
            board[row][col][tier] = piece;
        });
        return {
            id: gameId,
            board,
            currentPlayer: Player.PLAYER_1,
            status: GameStatus.ACTIVE,
            result: GameResult.ONGOING,
            moves: [],
            capturedPieces: [],
            startTime: Date.now(),
            winner: undefined
        };
    }
    /**
     * Create initial piece setup for both players
     * This follows the standard Gungi starting formation
     */
    createInitialPieces() {
        const pieces = [];
        let pieceIdCounter = 1;
        // Player 1 pieces (bottom of board, rows 6-8)
        const player1Setup = [
            // Back row (row 8)
            { type: PieceType.LANCE, col: 0 },
            { type: PieceType.BOW, col: 1 },
            { type: PieceType.FORT, col: 2 },
            { type: PieceType.GENERAL, col: 3 },
            { type: PieceType.MARSHAL, col: 4 }, // King in center
            { type: PieceType.GENERAL, col: 5 },
            { type: PieceType.FORT, col: 6 },
            { type: PieceType.BOW, col: 7 },
            { type: PieceType.LANCE, col: 8 },
            // Middle row (row 7)
            { type: PieceType.CANNON, col: 1 },
            { type: PieceType.LIEUTENANT, col: 2 },
            { type: PieceType.MAJOR, col: 3 },
            { type: PieceType.SHINOBI, col: 4 },
            { type: PieceType.MAJOR, col: 5 },
            { type: PieceType.LIEUTENANT, col: 6 },
            { type: PieceType.CANNON, col: 7 },
            // Front row (row 6) - all pawns
            ...Array(9).fill(null).map((_, col) => ({ type: PieceType.PAWN, col }))
        ];
        // Create Player 1 pieces
        player1Setup.forEach(({ type, col }, idx) => {
            const row = idx < 9 ? 8 : idx < 16 ? 7 : 6;
            const adjustedCol = idx < 9 ? col : idx < 16 ? col : idx - 16;
            pieces.push({
                id: `piece_${pieceIdCounter++}`,
                type,
                player: Player.PLAYER_1,
                position: { row, col: adjustedCol, tier: 0 },
                isActive: true,
                moveCount: 0
            });
        });
        // Player 2 pieces (top of board, rows 0-2) - mirror Player 1
        const player2Setup = [
            // Front row (row 2) - all pawns
            ...Array(9).fill(null).map((_, col) => ({ type: PieceType.PAWN, col })),
            // Middle row (row 1)
            { type: PieceType.CANNON, col: 1 },
            { type: PieceType.LIEUTENANT, col: 2 },
            { type: PieceType.MAJOR, col: 3 },
            { type: PieceType.SHINOBI, col: 4 },
            { type: PieceType.MAJOR, col: 5 },
            { type: PieceType.LIEUTENANT, col: 6 },
            { type: PieceType.CANNON, col: 7 },
            // Back row (row 0)
            { type: PieceType.LANCE, col: 0 },
            { type: PieceType.BOW, col: 1 },
            { type: PieceType.FORT, col: 2 },
            { type: PieceType.GENERAL, col: 3 },
            { type: PieceType.MARSHAL, col: 4 }, // King in center
            { type: PieceType.GENERAL, col: 5 },
            { type: PieceType.FORT, col: 6 },
            { type: PieceType.BOW, col: 7 },
            { type: PieceType.LANCE, col: 8 }
        ];
        // Create Player 2 pieces
        player2Setup.forEach(({ type, col }, idx) => {
            const row = idx < 9 ? 2 : idx < 16 ? 1 : 0;
            const adjustedCol = idx < 9 ? col : idx < 16 ? col : idx - 16;
            pieces.push({
                id: `piece_${pieceIdCounter++}`,
                type,
                player: Player.PLAYER_2,
                position: { row, col: adjustedCol, tier: 0 },
                isActive: true,
                moveCount: 0
            });
        });
        return pieces;
    }
    /**
     * Get current game state
     */
    getGameState() {
        return { ...this.gameState };
    }
    /**
     * Validate and execute a move
     */
    makeMove(from, to) {
        try {
            // Validate positions
            const fromValidation = PositionSchema.safeParse(from);
            const toValidation = PositionSchema.safeParse(to);
            if (!fromValidation.success || !toValidation.success) {
                return { success: false, error: 'Invalid position coordinates' };
            }
            // Check if game is active
            if (this.gameState.status !== GameStatus.ACTIVE) {
                return { success: false, error: 'Game is not active' };
            }
            // Get piece at from position
            const piece = this.getPieceAt(from);
            if (!piece) {
                return { success: false, error: 'No piece at source position' };
            }
            // Check if it's the correct player's turn
            if (piece.player !== this.gameState.currentPlayer) {
                return { success: false, error: 'Not your turn' };
            }
            // Validate the move is legal for this piece type
            const moveValidation = this.validateMove(piece, from, to);
            if (!moveValidation.isValid) {
                return { success: false, error: moveValidation.reason || 'Invalid move' };
            }
            // Execute the move
            const move = this.executeMoveInternal(piece, from, to);
            // Check for game end conditions
            this.checkGameEnd();
            return { success: true, move };
        }
        catch (error) {
            return { success: false, error: `Move execution failed: ${error}` };
        }
    }
    /**
     * Get piece at specific position
     */
    getPieceAt(position) {
        const { row, col, tier } = position;
        return this.gameState.board[row][col][tier];
    }
    /**
     * Validate if a move is legal for the given piece
     */
    validateMove(piece, from, to) {
        // Basic boundary checks
        if (to.row < 0 || to.row > 8 || to.col < 0 || to.col > 8 || to.tier < 0 || to.tier > 2) {
            return { isValid: false, reason: 'Move out of bounds' };
        }
        // Check if destination has own piece (cannot capture own pieces)
        const destinationPiece = this.getPieceAt(to);
        if (destinationPiece && destinationPiece.player === piece.player) {
            return { isValid: false, reason: 'Cannot capture own piece' };
        }
        // Validate move pattern based on piece type
        return this.validatePieceMovement(piece, from, to);
    }
    /**
     * Validate movement patterns for each piece type
     * This implements the core Gungi movement rules
     */
    validatePieceMovement(piece, from, to) {
        const rowDiff = Math.abs(to.row - from.row);
        const colDiff = Math.abs(to.col - from.col);
        const tierDiff = to.tier - from.tier;
        switch (piece.type) {
            case PieceType.MARSHAL:
                // King: one square in any direction, including up/down tiers
                if (rowDiff <= 1 && colDiff <= 1 && Math.abs(tierDiff) <= 1) {
                    return { isValid: true };
                }
                return { isValid: false, reason: 'Marshal can only move one square in any direction' };
            case PieceType.GENERAL:
                // Powerful piece: multiple squares in 8 directions, can move between tiers
                if ((rowDiff === 0 || colDiff === 0 || rowDiff === colDiff) &&
                    this.isPathClear(from, to)) {
                    return { isValid: true };
                }
                return { isValid: false, reason: 'General moves in straight or diagonal lines' };
            case PieceType.PAWN:
                // Basic forward movement, can stack
                const forwardDirection = piece.player === Player.PLAYER_1 ? -1 : 1;
                if (to.row === from.row + forwardDirection && colDiff === 0) {
                    return { isValid: true };
                }
                // Can also stack on same position
                if (rowDiff === 0 && colDiff === 0 && tierDiff > 0 && tierDiff <= 1) {
                    return { isValid: true };
                }
                return { isValid: false, reason: 'Pawn can only move forward or stack' };
            case PieceType.BOW:
                // Ranged attacker: can shoot over pieces
                if ((rowDiff === 0 || colDiff === 0 || rowDiff === colDiff) &&
                    rowDiff + colDiff > 1) { // Must be ranged attack
                    return { isValid: true };
                }
                return { isValid: false, reason: 'Bow must attack at range' };
            case PieceType.SHINOBI:
                // Stealth: can infiltrate enemy stacks
                if (rowDiff <= 2 && colDiff <= 2) {
                    return { isValid: true };
                }
                return { isValid: false, reason: 'Shinobi has limited range' };
            // Add more piece-specific movement rules...
            default:
                // Basic movement for other pieces
                if (rowDiff <= 2 && colDiff <= 2) {
                    return { isValid: true };
                }
                return { isValid: false, reason: 'Invalid movement for piece type' };
        }
    }
    /**
     * Check if path between two positions is clear (for sliding pieces)
     */
    isPathClear(from, to) {
        const rowStep = to.row > from.row ? 1 : to.row < from.row ? -1 : 0;
        const colStep = to.col > from.col ? 1 : to.col < from.col ? -1 : 0;
        let currentRow = from.row + rowStep;
        let currentCol = from.col + colStep;
        while (currentRow !== to.row || currentCol !== to.col) {
            // Check if there's a piece blocking the path
            if (this.getPieceAt({ row: currentRow, col: currentCol, tier: from.tier })) {
                return false;
            }
            currentRow += rowStep;
            currentCol += colStep;
        }
        return true;
    }
    /**
     * Execute the move and update game state
     */
    executeMoveInternal(piece, from, to) {
        const capturedPiece = this.getPieceAt(to);
        const isCapture = capturedPiece !== null;
        const isStack = from.row === to.row && from.col === to.col && to.tier > from.tier;
        // Remove piece from old position
        this.gameState.board[from.row][from.col][from.tier] = null;
        // Handle capture
        if (capturedPiece) {
            capturedPiece.isActive = false;
            this.gameState.capturedPieces.push(capturedPiece);
        }
        // Place piece at new position
        piece.position = to;
        piece.moveCount++;
        this.gameState.board[to.row][to.col][to.tier] = piece;
        // Create move record
        const move = {
            id: `move_${this.gameState.moves.length + 1}`,
            player: this.gameState.currentPlayer,
            piece: { ...piece },
            from,
            to,
            capturedPiece: capturedPiece ? { ...capturedPiece } : undefined,
            isCapture,
            isStack,
            timestamp: Date.now(),
            moveNumber: this.gameState.moves.length + 1
        };
        // Add move to history
        this.gameState.moves.push(move);
        // Switch players
        this.gameState.currentPlayer = this.gameState.currentPlayer === Player.PLAYER_1
            ? Player.PLAYER_2
            : Player.PLAYER_1;
        return move;
    }
    /**
     * Check for game end conditions
     */
    checkGameEnd() {
        // Check if either Marshal is captured
        const player1Marshal = this.findPieceByType(Player.PLAYER_1, PieceType.MARSHAL);
        const player2Marshal = this.findPieceByType(Player.PLAYER_2, PieceType.MARSHAL);
        if (!player1Marshal || !player1Marshal.isActive) {
            this.gameState.status = GameStatus.COMPLETED;
            this.gameState.result = GameResult.PLAYER_2_WIN;
            this.gameState.winner = Player.PLAYER_2;
            this.gameState.endTime = Date.now();
        }
        else if (!player2Marshal || !player2Marshal.isActive) {
            this.gameState.status = GameStatus.COMPLETED;
            this.gameState.result = GameResult.PLAYER_1_WIN;
            this.gameState.winner = Player.PLAYER_1;
            this.gameState.endTime = Date.now();
        }
        // Enhanced game end conditions: stalemate detection, time limits, etc.
        this.checkAdvancedEndConditions();
    }
    /**
     * Check for advanced game end conditions
     */
    checkAdvancedEndConditions() {
        // Check for stalemate (simplified check)
        if (this.gameState.status === GameStatus.ACTIVE) {
            // In a real implementation, we would check for legal moves
            // For now, just check if the game has been running too long
            const gameTimeLimit = 3600000; // 1 hour in milliseconds
            const currentTime = Date.now();
            if (this.gameState.startTime && currentTime - this.gameState.startTime > gameTimeLimit) {
                this.gameState.status = GameStatus.COMPLETED;
                this.gameState.result = GameResult.TIME_LIMIT;
                this.gameState.endTime = currentTime;
                return;
            }
            // Check for excessive turns (prevent infinite games)
            if (this.gameState.moves.length >= 500) {
                this.gameState.status = GameStatus.COMPLETED;
                this.gameState.result = GameResult.MOVE_LIMIT;
                this.gameState.endTime = currentTime;
                return;
            }
        }
    }
    /**
     * Find a piece by type for a specific player
     */
    findPieceByType(player, pieceType) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                for (let tier = 0; tier < 3; tier++) {
                    const piece = this.gameState.board[row][col][tier];
                    if (piece && piece.player === player && piece.type === pieceType && piece.isActive) {
                        return piece;
                    }
                }
            }
        }
        return null;
    }
    /**
     * Get all valid moves for the current player
     */
    getValidMoves() {
        const validMoves = [];
        const currentPlayerPieces = this.getAllPiecesForPlayer(this.gameState.currentPlayer);
        currentPlayerPieces.forEach(piece => {
            // For each piece, try all possible destinations
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    for (let tier = 0; tier < 3; tier++) {
                        const to = { row, col, tier };
                        const moveValidation = this.validateMove(piece, piece.position, to);
                        if (moveValidation.isValid) {
                            validMoves.push({
                                id: `potential_move`,
                                player: piece.player,
                                piece,
                                from: piece.position,
                                to,
                                capturedPiece: this.getPieceAt(to) || undefined,
                                isCapture: this.getPieceAt(to) !== null,
                                isStack: piece.position.row === row && piece.position.col === col && tier > piece.position.tier,
                                timestamp: Date.now(),
                                moveNumber: this.gameState.moves.length + 1
                            });
                        }
                    }
                }
            }
        });
        return validMoves;
    }
    /**
     * Get all pieces for a specific player
     */
    getAllPiecesForPlayer(player) {
        const pieces = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                for (let tier = 0; tier < 3; tier++) {
                    const piece = this.gameState.board[row][col][tier];
                    if (piece && piece.player === player && piece.isActive) {
                        pieces.push(piece);
                    }
                }
            }
        }
        return pieces;
    }
    /**
     * Get board as a simple 2D representation for visualization
     */
    getBoardRepresentation() {
        const boardRep = Array(9).fill(null).map(() => Array(9).fill('.'));
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                // Show the top piece at each position
                for (let tier = 2; tier >= 0; tier--) {
                    const piece = this.gameState.board[row][col][tier];
                    if (piece) {
                        const playerPrefix = piece.player === Player.PLAYER_1 ? '1' : '2';
                        const pieceChar = piece.type.charAt(0).toUpperCase();
                        boardRep[row][col] = `${playerPrefix}${pieceChar}`;
                        break; // Show only the topmost piece
                    }
                }
            }
        }
        return boardRep;
    }
    /**
     * Export game state as JSON string
     */
    exportGameState() {
        return JSON.stringify(this.gameState);
    }
    /**
     * Import game state from JSON string
     */
    importGameState(gameStateJson) {
        try {
            const parsedState = JSON.parse(gameStateJson);
            const validation = GameStateSchema.safeParse(parsedState);
            if (!validation.success) {
                console.error('Invalid game state:', validation.error);
                return false;
            }
            this.gameState = validation.data;
            return true;
        }
        catch (error) {
            console.error('Failed to import game state:', error);
            return false;
        }
    }
    /**
     * Set game status (for testing purposes)
     */
    setGameStatus(status, result, winner, endTime) {
        this.gameState.status = status;
        if (result !== undefined) {
            this.gameState.result = result;
        }
        if (winner !== undefined) {
            this.gameState.winner = winner;
        }
        if (endTime !== undefined) {
            this.gameState.endTime = endTime;
        }
    }
}
exports.GungiGameEngine = GungiGameEngine;
//# sourceMappingURL=GungiGameEngine.js.map