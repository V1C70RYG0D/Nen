/**
 * Mock Implementations for Betting Services
 */
export interface BetData {
    id: string;
    matchId: string;
    bettorWallet: string;
    amount: number;
    predictedWinner: string;
    predictedWinnerType: string;
    odds: number;
    placedAt: Date;
    status: 'active' | 'settled' | 'cancelled';
    potentialPayout: number;
    escrowAccount: string;
}
export interface BettingPool {
    matchId: string;
    totalPool: number;
    betsCount: number;
    isActive: boolean;
    bets: BetData[];
    createdAt: Date;
}
export declare class MockEnhancedBettingService {
    private activePools;
    private minBetAmount;
    private maxBetAmount;
    createBettingPool(matchId: string): Promise<BettingPool>;
    getBettingPool(matchId: string): Promise<BettingPool | null>;
    placeBet(bettorWallet: string, matchId: string, amount: number, predictedWinner: string, predictedWinnerType: string): Promise<BetData>;
    private calculateOdds;
    closeBettingPool(matchId: string): Promise<void>;
}
export declare class MockOptimizedBettingService {
    private activePools;
    private minBetAmount;
    private maxBetAmount;
    placeBet(bettorWallet: string, matchId: string, amount: number, predictedWinner: string, predictedWinnerType: string): Promise<{
        success: boolean;
        betId?: string;
        message: string;
        error?: string;
    }>;
    getBettingPool(matchId: string): Promise<BettingPool | null>;
}
export declare class MockBettingService {
    private bets;
    private pools;
    createBet(betData: Partial<BetData>): Promise<BetData>;
    getBet(betId: string): Promise<BetData | null>;
    getAllBets(): Promise<BetData[]>;
    updateBetStatus(betId: string, status: BetData['status']): Promise<void>;
}
export declare const mockEnhancedBettingService: MockEnhancedBettingService;
export declare const mockOptimizedBettingService: MockOptimizedBettingService;
export declare const mockBettingService: MockBettingService;
//# sourceMappingURL=bettingServiceMocks.d.ts.map