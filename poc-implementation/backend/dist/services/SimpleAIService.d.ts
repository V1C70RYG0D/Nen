/**
 * Simple AI Service for POC - Real Implementation

 * Provides actual AI move generation for Gungi gameplay
 */
export interface AIAgent {
    id: string;
    name: string;
    difficulty: 'easy' | 'medium' | 'hard' | 'expert' | 'legendary' | 'godlike';
    personality: 'aggressive' | 'defensive' | 'balanced' | 'creative';
    skillLevel: number;
    winRate: number;
    elo: number;
    description: string;
    specialty: string;
    gamesPlayed: number;
}
export interface AIMove {
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
    player: number;
    confidence: number;
    reasoning?: string;
}
export interface BoardState {
    pieces: any[];
    currentTurn: number;
    moveNumber: number;
    gameStatus: string;
}
export declare class SimpleAIService {
    private agents;
    private moveHistory;
    constructor();
    /**
     * Health check for service monitoring
     */
    healthCheck(): Promise<boolean>;
    /**
     * List all available AI agents
     */
    listAgents(): Promise<{
        agents: AIAgent[];
        total_count: number;
    }>;
    /**
     * Get specific AI agent by ID
     */
    getAgent(agentId: string): Promise<AIAgent | null>;
    /**
     * Generate AI move for given board state and agent
     */
    generateMove(agentId: string, boardState: BoardState): Promise<AIMove>;
    /**
     * Generate move based on agent difficulty level
     */
    private generateMoveByDifficulty;
    /**
     * Get valid moves for current board state (simplified for POC)
     */
    private getValidMoves;
    /**
     * Select move using basic heuristics
     */
    private selectMoveWithBasicHeuristics;
    /**
     * Select move using advanced heuristics
     */
    private selectMoveWithAdvancedHeuristics;
    /**
     * Evaluate move quality (simplified for POC)
     */
    private evaluateMove;
    /**
     * Generate reasoning for move selection
     */
    private generateMoveReasoning;
    /**
     * Remove agent (for testing purposes)
     */
    removeAgent(agentId: string): Promise<boolean>;
    /**
     * Create sample agent config for testing
     */
    createSampleAgentConfig(id: string, skillLevel: number, personality: string): any;
    /**
     * Create sample board state for testing
     */
    createSampleBoardState(currentTurn: number, moveNumber: number): BoardState;
    /**
     * Start training session (mock for POC)
     */
    startTraining(request: any): Promise<any>;
    /**
     * Get training status (mock for POC)
     */
    getTrainingStatus(sessionId: string): Promise<any>;
}
export declare const simpleAIService: SimpleAIService;
//# sourceMappingURL=SimpleAIService.d.ts.map