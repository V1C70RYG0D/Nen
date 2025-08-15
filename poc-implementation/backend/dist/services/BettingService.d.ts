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
export interface BettingAccount {
    userId: string;
    walletAddress: string;
    pdaAddress: string;
    balance: number;
    totalDeposited: number;
    totalWithdrawn: number;
    lockedBalance: number;
    lastUpdated: Date;
}
export interface DepositRequest {
    userId: string;
    walletAddress: string;
    amount: number;
    transactionSignature?: string;
}
export interface DepositResult {
    success: boolean;
    transactionId: string;
    newBalance: number;
    depositAmount: number;
    pdaAddress: string;
    message: string;
}
export interface WithdrawalRequest {
    userId: string;
    walletAddress: string;
    amount: number;
    destinationAddress?: string;
}
export interface WithdrawalResult {
    success: boolean;
    transactionId: string;
    newBalance: number;
    withdrawalAmount: number;
    message: string;
}
export interface TransactionRecord {
    id: string;
    userId: string;
    walletAddress: string;
    type: 'deposit' | 'withdrawal' | 'bet' | 'payout';
    amount: number;
    transactionHash?: string;
    status: 'pending' | 'confirmed' | 'failed';
    metadata?: Record<string, any>;
    createdAt: Date;
}
export declare class BettingService {
    private connection;
    private cache;
    private platformFeeRate;
    private programId;
    constructor();
    getBettingAccount(walletAddress: string): Promise<BettingAccount>;
    depositSol(depositRequest: DepositRequest): Promise<DepositResult>;
    withdrawSol(withdrawalRequest: WithdrawalRequest): Promise<WithdrawalResult>;
    getTransactionHistory(walletAddress: string, limit?: number): Promise<TransactionRecord[]>;
    private storeTransactionRecord;
    private updateTransactionStatus;
    private isValidSolanaAddress;
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