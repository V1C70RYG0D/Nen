export interface BetData {
    id: string;
    userId: string;
    matchId: string;
    amountSol: number;
    predictedWinnerId: string;
    predictedWinnerType: 'user' | 'ai';
    odds: number;
    potentialPayout: number;
    status: 'placed' | 'won' | 'lost' | 'refunded';
    actualPayout: number;
    settledAt?: Date;
    placementTxSignature?: string;
    settlementTxSignature?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface BettingPool {
    matchId: string;
    totalPool: number;
    agent1Pool: number;
    agent2Pool: number;
    agent1Odds: number;
    agent2Odds: number;
    betsCount: number;
    lastUpdated: Date;
}
export interface BettingLimits {
    minBetSol: number;
    maxBetSol: number;
    platformFeeRate: number;
}
export declare class BettingService {
    private connection;
    private cache;
    private platformFeeRate;
    constructor();
    placeBet(betData: {
        userId: string;
        matchId: string;
        amountSol: number;
        predictedWinnerId: string;
        predictedWinnerType: 'user' | 'ai';
        walletAddress: string;
    }): Promise<BetData>;
    getBettingPool(matchId: string): Promise<BettingPool>;
    private calculateOdds;
    private calculateOddsFromPool;
    getUserBets(userId: string, limit?: number): Promise<BetData[]>;
    settleBets(matchId: string, winnerId: string, winnerType: 'user' | 'ai'): Promise<void>;
    getBettingLimits(): Promise<BettingLimits>;
    private updateBettingPoolCache;
    getBettingStats(userId?: string): Promise<{
        totalBets: number;
        totalVolume: number;
        averageBet: number;
        winRate?: number;
        totalWinnings?: number;
    }>;
}
//# sourceMappingURL=BettingService.d.ts.map