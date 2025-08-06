/**
 * Optimized Betting Service - Final 5% Gap Closure
 * Implementation for production-ready betting with enhanced performance and reliability
 * Following GI.md guidelines for real implementations over simulations
 */
interface OptimizedBetData {
    id: string;
    matchId: string;
    bettorWallet: string;
    amount: number;
    predictedWinner: string;
    predictedWinnerType: 'user' | 'ai_agent';
    odds: number;
    placedAt: Date;
    status: 'active' | 'won' | 'lost' | 'cancelled';
    potentialPayout: number;
    escrowAccount?: string;
    riskScore: number;
}
interface BettingOdds {
    agent1?: {
        odds: number;
        pool: number;
    };
    agent2?: {
        odds: number;
        pool: number;
    };
    [key: string]: {
        odds: number;
        pool: number;
    } | undefined;
}
export declare class OptimizedBettingService {
    private activePools;
    private userBets;
    private readonly minBetAmount;
    private readonly maxBetAmount;
    private readonly platformFee;
    private readonly cacheTimeout;
    constructor();
    /**
     * Initialize default betting pools for testing and demo
     */
    private initializeDefaultPools;
    /**
     * Place a bet with optimized performance and validation
     */
    placeBet(bettorWallet: string, matchId: string, amount: number, predictedWinner: string, predictedWinnerType: 'user' | 'ai_agent'): Promise<{
        success: boolean;
        betId?: string;
        message?: string;
        error?: string;
    }>;
    /**
     * Calculate real-time odds with performance optimization
     */
    calculateOdds(matchId: string): Promise<BettingOdds | null>;
    /**
     * Get user betting history with pagination
     */
    getUserBets(userId: string, limit?: number): Promise<OptimizedBetData[]>;
    /**
     * Settle match with automated payout calculation
     */
    settleMatch(matchId: string, winnerId: string, finalScore?: any): Promise<{
        success: boolean;
        settledBets: number;
        totalPayout: number;
        error?: string;
    }>;
    /**
     * Performance-optimized helper methods
     */
    private createBettingPool;
    private calculateCurrentOdds;
    private calculateRiskScore;
    private determineBetResult;
    private invalidatePoolCache;
    /**
     * Health check for service monitoring
     */
    getHealthStatus(): {
        status: string;
        activePools: number;
        totalBets: number;
    };
}
export default OptimizedBettingService;
//# sourceMappingURL=OptimizedBettingService.d.ts.map