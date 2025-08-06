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
    /**
     * Start advanced AI training session with user-customizable parameters
     */
    startTrainingSession(config: AdvancedTrainingConfig): Promise<string>;
    /**
     * Execute the actual training session with self-play
     */
    private executeTrainingSession;
    /**
     * Run a single self-play game for training
     */
    private runSelfPlayGame;
    /**
     * Calculate ELO change based on game performance
     */
    private calculateEloChange;
    /**
     * Evolve personality traits based on training focus
     */
    private evolvePersonality;
    /**
     * Save training result after each game during training
     */
    private saveTrainingResult;
    /**
     * Calculate personality bonus for game simulation
     */
    private calculatePersonalityBonus;
    /**
     * Complete training session and update agent
     */
    private completeTrainingSession;
    /**
     * Fail training session and refund partial cost
     */
    private failTrainingSession;
    /**
     * Get training progress for a session
     */
    getTrainingProgress(sessionId: string): Promise<TrainingProgress | null>;
    /**
     * Cancel active training session
     */
    cancelTrainingSession(sessionId: string, userId: string): Promise<boolean>;
    /**
     * Get all training sessions for a user
     */
    getUserTrainingSessions(userId: string): Promise<any[]>;
    /**
     * Get training result for completed session
     */
    getTrainingResult(sessionId: string): Promise<TrainingResult>;
    /**
     * Stop training session (alias for cancel)
     */
    stopTraining(sessionId: string): Promise<boolean>;
    /**
     * Calculate training duration in hours
     */
    private calculateTrainingDuration;
}
export declare const enhancedAITrainingService: EnhancedAITrainingServiceV3;
//# sourceMappingURL=EnhancedAITrainingServiceV3.d.ts.map