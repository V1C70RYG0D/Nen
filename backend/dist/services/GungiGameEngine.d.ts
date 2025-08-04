export declare enum PieceType {
    MARSHAL = "marshal",
    GENERAL = "general",
    LIEUTENANT = "lieutenant",
    MAJOR = "major",
    MINOR = "minor",
    SHINOBI = "shinobi",
    BOW = "bow",
    CANNON = "cannon",
    FORT = "fort",
    PAWN = "pawn",
    FORTRESS = "fortress",
    LANCE = "lance",
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
    private initializeGame;
    private createInitialPieces;
    getGameState(): GameState;
    makeMove(from: Position, to: Position): {
        success: boolean;
        error?: string;
        move?: Move;
    };
    private getPieceAt;
    private validateMove;
    private validatePieceMovement;
    private isPathClear;
    private executeMoveInternal;
    private checkGameEnd;
    private checkAdvancedEndConditions;
    private findPieceByType;
    getValidMoves(): Move[];
    private getAllPiecesForPlayer;
    getBoardRepresentation(): string[][];
    exportGameState(): string;
    importGameState(gameStateJson: string): boolean;
    setGameStatus(status: GameStatus, result?: GameResult, winner?: Player, endTime?: number): void;
}
//# sourceMappingURL=GungiGameEngine.d.ts.map