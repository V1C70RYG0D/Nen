/**
 * Enhanced AI Training Service
 * Implements advanced AI training features mentioned in POC Backend Plan
 *
 * Features:
 * - Self-play training sessions
 * - Weekly automated updates
 * - Performance tracking and ELO adjustments
 * - Custom personality training
 * - Batch training optimization
 */
interface TrainingSchedule {
    agentId: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    lastTraining: Date;
    nextTraining: Date;
    gamesPerSession: number;
    enabled: boolean;
}
interface SelfPlaySession {
    id: string;
    agentId: string;
    opponentId: string;
    gamesPlayed: number;
    winRate: number;
    averageGameLength: number;
    eloChange: number;
    started: Date;
    completed?: Date;
    status: 'running' | 'completed' | 'failed';
}
interface TrainingMetrics {
    totalSessions: number;
    totalGames: number;
    averageWinRate: number;
    eloImprovement: number;
    lastUpdate: Date;
    nextScheduledUpdate: Date;
}
declare class EnhancedAITrainingService {
    private aiService;
    private dbService;
    private trainingSchedules;
    private activeSessions;
    private trainingInterval;
    constructor();
    private setupTrainingScheduler;
    /**
     * Schedule weekly training for an AI agent
     */
    scheduleWeeklyTraining(agentId: string, gamesPerSession?: number): Promise<void>;
    /**
     * Check for agents that need training
     */
    private checkScheduledTraining;
    /**
     * Start self-play training session with advanced learning
     */
    startSelfPlayTraining(agentId: string, numberOfGames?: number): Promise<SelfPlaySession>;
    /**
     * Play a single self-play game with advanced AI learning
     */
    private playSelfPlayGame;
    /**
     * Run self-play training session
     */
    private runSelfPlaySession;
    /**
     * Execute a real self-play game using AI agents
     */
    private simulateSelfPlayGame;
    private getAgent;
    private selectOpponent;
    private executeAIGame;
    /**
     * Get current agent ELO
     */
    private getAgentElo;
    /**
     * Calculate new ELO rating after training
     */
    private calculateEloAfterTraining;
    /**
     * Update agent after training completion
     */
    private updateAgentAfterTraining;
    /**
     * Get training metrics for an agent
     */
    getTrainingMetrics(agentId: string): Promise<TrainingMetrics>;
    /**
     * Get all active training sessions
     */
    getActiveSessions(): SelfPlaySession[];
    /**
     * Stop training for an agent
     */
    stopTraining(agentId: string): Promise<void>;
    /**
     * Update agent ELO rating in database
     */
    private updateAgentELO;
    /**
     * Graceful shutdown
     */
    shutdown(): Promise<void>;
}
export declare const getEnhancedAITrainingService: () => EnhancedAITrainingService;
export { EnhancedAITrainingService, TrainingSchedule, SelfPlaySession, TrainingMetrics };
//# sourceMappingURL=EnhancedAITrainingService.d.ts.map