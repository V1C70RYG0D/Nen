interface TrainingSchedule {
    agentId: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    lastTraining: Date;
    nextTraining: Date;
    gamesPerSession: number;
    enabled: boolean;
    priority: 'low' | 'medium' | 'high';
}
interface SelfPlaySession {
    id: string;
    agentId: string;
    opponentId: string;
    gamesPlayed: number;
    targetGames: number;
    winRate: number;
    averageGameLength: number;
    eloChange: number;
    started: Date;
    completed?: Date;
    status: 'running' | 'completed' | 'failed' | 'paused';
    learningData: any[];
    computeTime: number;
}
interface TrainingMetrics {
    totalSessions: number;
    totalGames: number;
    averageWinRate: number;
    eloImprovement: number;
    lastUpdate: Date;
    nextScheduledUpdate: Date;
    computeEfficiency: number;
}
declare class EnhancedAITrainingServiceV2 {
    private aiService;
    private dbService;
    private trainingSchedules;
    private activeSessions;
    private trainingInterval;
    private maxConcurrentSessions;
    private retryAttempts;
    constructor();
    private setupAdvancedTrainingScheduler;
    private setupErrorRecovery;
    scheduleWeeklyTraining(agentId: string, gamesPerSession?: number, priority?: 'low' | 'medium' | 'high'): Promise<void>;
    private checkScheduledTraining;
    startAdvancedSelfPlayTraining(agentId: string, numberOfGames?: number): Promise<SelfPlaySession>;
    private executeParallelTraining;
    private playAdvancedSelfPlayGame;
    private processTrainingResults;
    private calculateAdvancedPerformanceScore;
    private calculateELOChange;
    private updateAgentWithLearning;
    private storeTrainingSession;
    private calculatePersonalityFactor;
    private getPersonalityGameLengthFactor;
    private generateAdvancedOpeningSequence;
    private generateMidgameAnalysis;
    private generateAdvancedCriticalPositions;
    private generateAdvancedEndgamePattern;
    private generateLearningPoints;
    private calculateConsistency;
    private calculateImprovement;
    private calculateOptimalBatchSize;
    private estimateComputeTime;
    private optimizeTrainingLoad;
    private recoverFailedSessions;
    private attemptSessionRecovery;
    private scheduleRetry;
    private cleanupCompletedSessions;
    private storeTrainingResults;
    getTrainingMetrics(agentId: string): Promise<TrainingMetrics>;
    getActiveTrainingSessions(): Promise<SelfPlaySession[]>;
    stopTrainingSession(sessionId: string): Promise<void>;
    shutdown(): Promise<void>;
}
export declare function getEnhancedAITrainingServiceV2(): EnhancedAITrainingServiceV2;
export default EnhancedAITrainingServiceV2;
export { EnhancedAITrainingServiceV2, TrainingSchedule, SelfPlaySession, TrainingMetrics };
//# sourceMappingURL=EnhancedAITrainingServiceV2.d.ts.map