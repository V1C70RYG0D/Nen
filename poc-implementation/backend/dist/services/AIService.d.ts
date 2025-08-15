export interface AIAgent {
    id: string;
    ownerId?: string;
    nftMintAddress?: string;
    name: string;
    description: string;
    personalityTraits: {
        aggression: number;
        patience: number;
        riskTolerance: number;
        adaptability: number;
        [key: string]: number;
    };
    playingStyle: {
        preferredOpenings: string[];
        strategicFocus: 'aggressive' | 'defensive' | 'balanced' | 'tactical';
        endgameStyle: 'patient' | 'aggressive' | 'adaptive';
        [key: string]: any;
    };
    skillLevel: number;
    eloRating: number;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    trainingDataCount: number;
    modelVersion: string;
    modelHash?: string;
    isPublic: boolean;
    isTradeable: boolean;
    marketPrice?: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface TrainingSession {
    id: string;
    aiAgentId: string;
    userId: string;
    trainingType: 'self_play' | 'supervised' | 'user_games';
    episodesCount: number;
    gamesTrainedOn: number;
    trainingParameters: Record<string, any>;
    personalityModifications: Record<string, number>;
    openingPreferences: Record<string, any>;
    strategicFocus: Record<string, any>;
    initialElo: number;
    finalElo: number;
    improvementMetrics: Record<string, any>;
    trainingCostSol: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startedAt?: Date;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface GameMove {
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
    evaluation?: number;
    confidence?: number;
}
export declare class AIService {
    private cache;
    constructor();
    getAgent(agentId: string): Promise<AIAgent | null>;
    getAvailableAgents(filters?: {
        isPublic?: boolean;
        minElo?: number;
        maxElo?: number;
        skillLevel?: number;
        limit?: number;
    }): Promise<AIAgent[]>;
    getMove(agentId: string, gameState: any, timeLimit?: number): Promise<GameMove | null>;
    private generateMove;
    private getRandomMove;
    private getMediumMove;
    private getHardMove;
    private getExpertMove;
    private evaluatePosition;
    startTraining(trainingData: {
        aiAgentId: string;
        userId: string;
        trainingType: TrainingSession['trainingType'];
        episodesCount?: number;
        personalityModifications?: Record<string, number>;
        openingPreferences?: Record<string, any>;
        strategicFocus?: Record<string, any>;
    }): Promise<TrainingSession>;
    private runTrainingSession;
    private calculateTrainingCost;
    getTrainingSession(sessionId: string): Promise<TrainingSession | null>;
    updateAgentElo(agentId: string, result: 'win' | 'loss' | 'draw', opponentElo: number): Promise<void>;
}
//# sourceMappingURL=AIService.d.ts.map