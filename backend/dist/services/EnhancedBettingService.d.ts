interface BetData {
    id: string;
    matchId: string;
    bettorWallet: string;
    amount: number;
    predictedWinner: string;
    predictedWinnerType: 'user' | 'ai_agent';
    odds: number;
    placedAt: Date;
    status: BetStatus;
    potentialPayout: number;
    escrowAccount?: string;
    kycStatus: KYCStatus;
    geoLocation?: string;
    riskScore: number;
    complianceChecks: ComplianceCheck[];
    fraudDetectionScore: number;
}
interface BettingPool {
    matchId: string;
    totalPool: number;
    betsCount: number;
    oddsPlayer1: number;
    oddsPlayer2: number;
    bets: BetData[];
    isActive: boolean;
    settlementTx?: string;
    complianceStatus: PoolComplianceStatus;
    riskLevel: RiskLevel;
    geographicRestrictions: string[];
    maxBetLimits: Map<string, number>;
}
declare enum BetStatus {
    PENDING = "pending",
    ACTIVE = "active",
    WON = "won",
    LOST = "lost",
    CANCELLED = "cancelled",
    SETTLED = "settled",
    FLAGGED = "flagged",
    UNDER_REVIEW = "under_review"
}
declare enum KYCStatus {
    NOT_VERIFIED = "not_verified",
    PENDING = "pending",
    VERIFIED = "verified",
    REJECTED = "rejected",
    EXPIRED = "expired"
}
declare enum PoolComplianceStatus {
    COMPLIANT = "compliant",
    UNDER_REVIEW = "under_review",
    RESTRICTED = "restricted",
    BLOCKED = "blocked"
}
declare enum RiskLevel {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
interface ComplianceCheck {
    type: 'kyc' | 'aml' | 'geo' | 'sanctions' | 'fraud';
    status: 'passed' | 'failed' | 'pending';
    timestamp: Date;
    details?: string;
    score?: number;
}
export declare class EnhancedBettingService {
    private logger;
    private config;
    private activePools;
    constructor();
    createBettingPool(matchId: string): Promise<BettingPool>;
    placeBet(bettorWallet: string, matchId: string, amount: number, predictedWinner: string, predictedWinnerType: 'user' | 'ai_agent'): Promise<BetData>;
    settleBets(matchId: string, winner: string, winnerType: 'user' | 'ai_agent'): Promise<void>;
    getBettingPool(matchId: string): Promise<BettingPool | null>;
    private createBetEscrow;
    private calculateOdds;
    private updatePoolOdds;
    private processPayout;
    private transferPlatformFee;
    closeBetting(matchId: string): Promise<void>;
    getBettingStats(): any;
}
export {};
//# sourceMappingURL=EnhancedBettingService.d.ts.map