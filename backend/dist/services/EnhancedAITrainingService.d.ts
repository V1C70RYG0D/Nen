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
    scheduleWeeklyTraining(agentId: string, gamesPerSession?: number): Promise<void>;
    private checkScheduledTraining;
    startSelfPlayTraining(agentId: string, numberOfGames?: number): Promise<SelfPlaySession>;
    private playSelfPlayGame;
    private runSelfPlaySession;
    private simulateSelfPlayGame;
    private getAgent;
    private selectOpponent;
    private executeAIGame;
    private getAgentElo;
    private calculateEloAfterTraining;
    private updateAgentAfterTraining;
    getTrainingMetrics(agentId: string): Promise<TrainingMetrics>;
    getActiveSessions(): SelfPlaySession[];
    stopTraining(agentId: string): Promise<void>;
    private updateAgentELO;
    shutdown(): Promise<void>;
}
export declare const getEnhancedAITrainingService: () => EnhancedAITrainingService;
export { EnhancedAITrainingService, TrainingSchedule, SelfPlaySession, TrainingMetrics };
//# sourceMappingURL=EnhancedAITrainingService.d.ts.map