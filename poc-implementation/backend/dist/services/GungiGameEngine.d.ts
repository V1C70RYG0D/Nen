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
export declare enum PieceType {
    MARSHAL = "marshal",// King equivalent
    GENERAL = "general",// Powerful 8-direction attacker
    LIEUTENANT = "lieutenant",// Mid-range diagonal piece
    MAJOR = "major",// L-shaped movement
    MINOR = "minor",// Linear movement
    SHINOBI = "shinobi",// Stealth infiltrator
    BOW = "bow",// Ranged attacker
    CANNON = "cannon",// Stack destroyer
    FORT = "fort",// Defensive structure
    PAWN = "pawn",// Basic unit
    FORTRESS = "fortress",// Advanced defense
    LANCE = "lance",// Linear penetrator
    SPY = "spy"
}
export declare enum Player {
    PLAYER_1 = 1,
    PLAYER_2 = 2
}
export declare enum GameStatus {
    PENDING = "pending",
    ACTIVE = "active",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export declare enum GameResult {
    PLAYER_1_WIN = "player1_win",
    PLAYER_2_WIN = "player2_win",
    DRAW = "draw",
    STALEMATE = "stalemate",
    TIME_LIMIT = "time_limit",
    MOVE_LIMIT = "move_limit",
    ONGOING = "ongoing"
}
export interface Position {
    row: number;
    col: number;
    tier: number;
}
export interface Piece {
    id: string;
    type: PieceType;
    player: Player;
    position: Position;
    isActive: boolean;
    moveCount: number;
}
export interface Move {
    id: string;
    player: Player;
    piece: Piece;
    from: Position;
    to: Position;
    capturedPiece?: Piece | undefined;
    isCapture: boolean;
    isStack: boolean;
    timestamp: number;
    moveNumber: number;
}
export interface GameState {
    id: string;
    board: (Piece | null)[][][];
    currentPlayer: Player;
    status: GameStatus;
    result: GameResult;
    moves: Move[];
    capturedPieces: Piece[];
    startTime: number;
    endTime?: number | undefined;
    winner?: Player | undefined;
}
export declare class GungiGameEngine {
    private gameState;
    constructor(gameId: string);
    /**
     * Initialize a new Gungi game with starting positions
     */
    private initializeGame;
    /**
     * Create initial piece setup for both players
     * This follows the standard Gungi starting formation
     */
    private createInitialPieces;
    /**
     * Get current game state
     */
    getGameState(): GameState;
    /**
     * Validate and execute a move
     */
    makeMove(from: Position, to: Position): {
        success: boolean;
        error?: string;
        move?: Move;
    };
    /**
     * Get piece at specific position
     */
    private getPieceAt;
    /**
     * Validate if a move is legal for the given piece
     */
    private validateMove;
    /**
     * Validate movement patterns for each piece type
     * This implements the core Gungi movement rules
     */
    private validatePieceMovement;
    /**
     * Check if path between two positions is clear (for sliding pieces)
     */
    private isPathClear;
    /**
     * Execute the move and update game state
     */
    private executeMoveInternal;
    /**
     * Check for game end conditions
     */
    private checkGameEnd;
    /**
     * Check for advanced game end conditions
     */
    private checkAdvancedEndConditions;
    /**
     * Find a piece by type for a specific player
     */
    private findPieceByType;
    /**
     * Get all valid moves for the current player
     */
    getValidMoves(): Move[];
    /**
     * Get all pieces for a specific player
     */
    private getAllPiecesForPlayer;
    /**
     * Get board as a simple 2D representation for visualization
     */
    getBoardRepresentation(): string[][];
    /**
     * Export game state as JSON string
     */
    exportGameState(): string;
    /**
     * Import game state from JSON string
     */
    importGameState(gameStateJson: string): boolean;
    /**
     * Set game status (for testing purposes)
     */
    setGameStatus(status: GameStatus, result?: GameResult, winner?: Player, endTime?: number): void;
}
//# sourceMappingURL=GungiGameEngine.d.ts.map