/**
 * Performance Metrics Service
 * Comprehensive monitoring system for key performance metrics including:
 * - Session metrics
 * - Game generation performance
 * - Memory/resource tracking
 * - Win rate calculations
 *
 * Following GI #2: Real implementations with actual database operations
 * Following GI #18: No hardcoding, externalized configuration
 * Following GI #20: Robust error handling and logging
 */
interface WinRateData {
    player?: string;
    aiAgent?: string;
    wins: number;
    losses: number;
    draws: number;
    totalGames: number;
    winRate: number;
    averageGameDuration: number;
}
export declare class PerformanceMetricsService {
    private cache;
    private sessionDurationHistogram;
    private sessionCounter;
    private activeSessionsGauge;
    private gameGenerationDurationHistogram;
    private gameGenerationCounter;
    private aiMoveGenerationSummary;
    private memoryUsageGauge;
    private cpuUsageGauge;
    private diskUsageGauge;
    private networkConnectionsGauge;
    private winRateGauge;
    private gameOutcomeCounter;
    private matchDurationHistogram;
    constructor();
    private initializeMetrics;
    trackSessionStart(sessionId: string, userId?: string, metadata?: any): Promise<void>;
    trackSessionActivity(sessionId: string, activityType: string, metadata?: any): Promise<void>;
    trackSessionEnd(sessionId: string): Promise<void>;
    trackGameGenerationStart(gameId: string, generationType: string, aiDifficulty?: string): Promise<void>;
    trackGameGenerationMove(gameId: string, moveNumber: number, aiGenerationTime?: number): Promise<void>;
    trackGameGenerationEnd(gameId: string, winner?: string, winnerType?: string): Promise<void>;
    calculateWinRates(playerId?: string, aiAgentId?: string, timeframe?: string): Promise<WinRateData[]>;
    private startResourceMonitoring;
    private collectResourceMetrics;
    getPerformanceReport(timeframe?: string): Promise<any>;
    private getSessionStatistics;
    private getGameGenerationStatistics;
    private getResourceStatistics;
    private getSystemHealthStatus;
    private mapSessionFromDB;
    private mapGameMetricFromDB;
}
export declare const performanceMetricsService: PerformanceMetricsService;
export {};
//# sourceMappingURL=PerformanceMetricsService.d.ts.map