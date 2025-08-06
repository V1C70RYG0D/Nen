/**
 * Enhanced AI Training Service V2 - Final Implementation
 * Implements advanced AI training features for 5% gap closure
 *
 * Features:
 * - Advanced self-play training sessions with parallel processing
 * - Weekly automated updates with ELO adjustments
 * - Performance tracking and learning data generation
 * - Custom personality training with specialized strategies
 * - Load testing support for 1000+ concurrent training sessions
 * - Error recovery and auto-retry mechanisms
 */
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
    /**
     * Schedule weekly training with priority and load balancing
     */
    scheduleWeeklyTraining(agentId: string, gamesPerSession?: number, priority?: 'low' | 'medium' | 'high'): Promise<void>;
    /**
     * Check for agents that need training with priority handling
     */
    private checkScheduledTraining;
    /**
     * Start advanced self-play training with parallel processing and monitoring
     */
    startAdvancedSelfPlayTraining(agentId: string, numberOfGames?: number): Promise<SelfPlaySession>;
    /**
     * Execute parallel training with load balancing
     */
    private executeParallelTraining;
    /**
     * Play a single advanced self-play game with detailed learning data
     */
    private playAdvancedSelfPlayGame;
    /**
     * Process training results and calculate improvements
     */
    private processTrainingResults;
    /**
     * Calculate advanced performance score with multiple metrics
     */
    private calculateAdvancedPerformanceScore;
    /**
     * Calculate ELO change based on performance
     */
    private calculateELOChange;
    /**
     * Update agent with learning data and ELO
     */
    private updateAgentWithLearning;
    /**
     * Store training session for analytics
     */
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
    /**
     * Optimize training load across sessions
     */
    private optimizeTrainingLoad;
    /**
     * Recover failed training sessions with retry logic
     */
    private recoverFailedSessions;
    /**
     * Attempt to recover a failed training session
     */
    private attemptSessionRecovery;
    /**
     * Schedule retry with exponential backoff
     */
    private scheduleRetry;
    /**
     * Clean up completed sessions to prevent memory leaks
     */
    private cleanupCompletedSessions;
    /**
     * Store training results in database
     */
    private storeTrainingResults;
    /**
     * Get training metrics for an agent
     */
    getTrainingMetrics(agentId: string): Promise<TrainingMetrics>;
    /**
     * Get active training sessions
     */
    getActiveTrainingSessions(): Promise<SelfPlaySession[]>;
    /**
     * Stop a training session
     */
    stopTrainingSession(sessionId: string): Promise<void>;
    /**
     * Shutdown service and cleanup
     */
    shutdown(): Promise<void>;
}
export declare function getEnhancedAITrainingServiceV2(): EnhancedAITrainingServiceV2;
export default EnhancedAITrainingServiceV2;
export { EnhancedAITrainingServiceV2, TrainingSchedule, SelfPlaySession, TrainingMetrics };
//# sourceMappingURL=EnhancedAITrainingServiceV2.d.ts.map