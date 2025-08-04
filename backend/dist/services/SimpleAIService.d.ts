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
    healthCheck(): Promise<boolean>;
    listAgents(): Promise<{
        agents: AIAgent[];
        total_count: number;
    }>;
    getAgent(agentId: string): Promise<AIAgent | null>;
    generateMove(agentId: string, boardState: BoardState): Promise<AIMove>;
    private generateMoveByDifficulty;
    private getValidMoves;
    private selectMoveWithBasicHeuristics;
    private selectMoveWithAdvancedHeuristics;
    private evaluateMove;
    private generateMoveReasoning;
    removeAgent(agentId: string): Promise<boolean>;
    createSampleAgentConfig(id: string, skillLevel: number, personality: string): any;
    createSampleBoardState(currentTurn: number, moveNumber: number): BoardState;
    startTraining(request: any): Promise<any>;
    getTrainingStatus(sessionId: string): Promise<any>;
}
export declare const simpleAIService: SimpleAIService;
//# sourceMappingURL=SimpleAIService.d.ts.map