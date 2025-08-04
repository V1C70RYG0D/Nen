export interface AdvancedTrainingConfig {
    aiAgentId: string;
    userId: string;
    trainingType: 'self_play' | 'tournament' | 'personality_focused' | 'opening_mastery';
    episodesCount: number;
    learningRate: number;
    batchSize: number;
    explorationRate: number;
    targetImprovement: number;
    personalityFocus?: {
        aggression?: number;
        patience?: number;
        riskTolerance?: number;
        adaptability?: number;
    };
    openingPreferences?: string[];
    strategicFocus?: 'aggressive' | 'defensive' | 'balanced' | 'tactical';
    maxTrainingHours: number;
    costPerHour: number;
}
export interface TrainingProgress {
    sessionId: string;
    currentEpisode: number;
    totalEpisodes: number;
    currentElo: number;
    targetElo: number;
    gamesPlayed: number;
    winRate: number;
    averageMovesPerGame: number;
    personalityEvolution: Record<string, number>;
    estimatedCompletionTime: Date;
    costAccumulated: number;
}
export interface TrainingResult {
    sessionId: string;
    success: boolean;
    initialElo: number;
    finalElo: number;
    improvement: number;
    gamesPlayed: number;
    finalPersonality: Record<string, number>;
    trainedOpenings: string[];
    totalCost: number;
    trainingDuration: number;
    performanceMetrics: {
        winRateImprovement: number;
        tacticalAccuracy: number;
        endgameSkill: number;
        openingRepertoire: number;
    };
}
export declare class EnhancedAITrainingServiceV3 {
    private cache;
    private aiService;
    private activeSessions;
    constructor();
    startTrainingSession(config: AdvancedTrainingConfig): Promise<string>;
    private executeTrainingSession;
    private runSelfPlayGame;
    private calculateEloChange;
    private evolvePersonality;
    private saveTrainingResult;
    private calculatePersonalityBonus;
    private completeTrainingSession;
    private failTrainingSession;
    getTrainingProgress(sessionId: string): Promise<TrainingProgress | null>;
    cancelTrainingSession(sessionId: string, userId: string): Promise<boolean>;
    getUserTrainingSessions(userId: string): Promise<any[]>;
    getTrainingResult(sessionId: string): Promise<TrainingResult>;
    stopTraining(sessionId: string): Promise<boolean>;
    private calculateTrainingDuration;
}
export declare const enhancedAITrainingService: EnhancedAITrainingServiceV3;
//# sourceMappingURL=EnhancedAITrainingServiceV3.d.ts.map