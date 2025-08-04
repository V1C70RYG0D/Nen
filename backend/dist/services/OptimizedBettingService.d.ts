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
    private initializeDefaultPools;
    placeBet(bettorWallet: string, matchId: string, amount: number, predictedWinner: string, predictedWinnerType: 'user' | 'ai_agent'): Promise<{
        success: boolean;
        betId?: string;
        message?: string;
        error?: string;
    }>;
    calculateOdds(matchId: string): Promise<BettingOdds | null>;
    getUserBets(userId: string, limit?: number): Promise<OptimizedBetData[]>;
    settleMatch(matchId: string, winnerId: string, finalScore?: any): Promise<{
        success: boolean;
        settledBets: number;
        totalPayout: number;
        error?: string;
    }>;
    private createBettingPool;
    private calculateCurrentOdds;
    private calculateRiskScore;
    private determineBetResult;
    private invalidatePoolCache;
    getHealthStatus(): {
        status: string;
        activePools: number;
        totalBets: number;
    };
}
export default OptimizedBettingService;
//# sourceMappingURL=OptimizedBettingService.d.ts.map