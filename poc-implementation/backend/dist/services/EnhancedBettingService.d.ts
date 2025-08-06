/**
 * Enhanced Betting Service for Nen Platform POC Phase 2
 * Step 2.3: Enhanced Betting with Compliance (Days 53-60)
 *
 * Implements advanced betting service with KYC/AML integration as per POC Master Plan:
 * - SOL betting with escrow and automatic payouts
 * - KYC/AML compliance integration
 * - Enhanced settlement with fraud detection
 * - Multi-sig security in contracts
 * - Geographic restriction support
 * - Real-time odds calculation
 *
 * Following GI.md guidelines for production-ready implementation with validation frameworks
 */
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
    /**
     * Create a new betting pool for a match
     */
    createBettingPool(matchId: string): Promise<BettingPool>;
    /**
     * Place a bet on a match
     */
    placeBet(bettorWallet: string, matchId: string, amount: number, predictedWinner: string, predictedWinnerType: 'user' | 'ai_agent'): Promise<BetData>;
    /**
     * Settle all bets for a completed match
     */
    settleBets(matchId: string, winner: string, winnerType: 'user' | 'ai_agent'): Promise<void>;
    /**
     * Get betting pool information
     */
    getBettingPool(matchId: string): Promise<BettingPool | null>;
    /**
     * Create escrow account for bet
     */
    private createBetEscrow;
    /**
     * Calculate dynamic odds based on betting pool
     */
    private calculateOdds;
    /**
     * Update pool odds after new bet
     */
    private updatePoolOdds;
    /**
     * Process payout to winning bettor
     */
    private processPayout;
    /**
     * Transfer platform fee to treasury
     */
    private transferPlatformFee;
    /**
     * Close betting for a match
     */
    closeBetting(matchId: string): Promise<void>;
    /**
     * Get betting statistics
     */
    getBettingStats(): any;
}
export {};
//# sourceMappingURL=EnhancedBettingService.d.ts.map