export interface GameState {
    id: string;
    board: (string | null)[][];
    stacks: Record<string, string[]>;
    currentPlayer: 'player1' | 'player2';
    moveHistory: GameMove[];
    status: 'pending' | 'active' | 'completed' | 'cancelled';
    winner?: 'player1' | 'player2' | 'draw';
    createdAt: Date;
    updatedAt: Date;
}
export interface GameMove {
    id: string;
    gameId: string;
    playerId: string;
    from: {
        x: number;
        y: number;
        level: number;
    };
    to: {
        x: number;
        y: number;
        level: number;
    };
    piece: string;
    timestamp: Date;
    moveNumber: number;
    isCapture: boolean;
    capturedPiece?: string;
}
export interface MatchData {
    id: string;
    matchType: 'ai_vs_ai' | 'human_vs_ai' | 'human_vs_human';
    status: 'pending' | 'active' | 'completed' | 'cancelled';
    player1Id?: string;
    player2Id?: string;
    aiAgent1Id?: string;
    aiAgent2Id?: string;
    winnerId?: string;
    winnerType?: 'user' | 'ai';
    magicblockSessionId?: string;
    gameState?: GameState;
    bettingPoolSol: number;
    isBettingActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare class GameService {
    private cache;
    constructor();
    createMatch(matchData: Partial<MatchData>): Promise<MatchData>;
    startMatch(matchId: string): Promise<MatchData>;
    getMatch(matchId: string): Promise<MatchData | null>;
    getActiveMatches(): Promise<MatchData[]>;
    makeMove(gameId: string, move: Omit<GameMove, 'id' | 'timestamp' | 'moveNumber'>): Promise<GameMove>;
    private runAIMatch;
    private initializeGameState;
    private validateMove;
    private applyMove;
    private checkGameEnd;
    private getAIMove;
    private generateValidMoves;
    /**
     * Get available games configuration
     */
    getAvailableGames(): Promise<any[]>;
    /**
     * Get match by ID (alias for getMatch)
     */
    getMatchById(matchId: string): Promise<MatchData | null>;
    /**
     * Execute a move with validation and state updates
     */
    executeMove(matchId: string, playerId: string, move: any): Promise<{
        valid: boolean;
        error?: string;
        gameState?: GameState;
        nextPlayerType?: 'human' | 'ai';
        nextPlayerId?: string;
        moveNumber?: number;
    }>;
    /**
     * Get matches for a specific player
     */
    getPlayerMatches(playerId: string, limit?: number, offset?: number): Promise<MatchData[]>;
    /**
     * Surrender/forfeit a match
     */
    surrenderMatch(matchId: string, playerId: string): Promise<{
        matchId: string;
        winnerId: string;
        reason: string;
    }>;
}
//# sourceMappingURL=GameService.d.ts.map