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
    private config;
    private activePools;
    private userBetHistory;
    private complianceCache;
    constructor();
    /**
     * Create a new betting pool with validations
     */
    createBettingPool(matchId: string): Promise<BettingPool>;
    /**
     * Place a bet with comprehensive validations
     */
    placeBet(matchId: string, bettorWallet: string, amount: number, predictedWinner: string, predictedWinnerType: 'user' | 'ai_agent', geoLocation?: string): Promise<BetData>;
    private performComplianceChecks;
    private calculateRiskScore;
    private validateBetAmount;
    private validateUserLimits;
    private checkKYC;
    private checkAML;
    private checkFraud;
    private getKYCStatus;
    private calculateFraudScore;
    private isFlaggedWallet;
    private isHighRiskWallet;
    private performEnhancedAMLCheck;
    private calculateRiskFactors;
    private updatePoolOdds;
    private generateEscrowAccount;
    /**
     * Get betting pool information
     */
    getBettingPool(matchId: string): Promise<BettingPool | null>;
    /**
     * Get user betting history
     */
    getUserBetHistory(wallet: string): BetData[];
    /**
     * Get status for a bet
     */
    getComplianceStatus(betId: string): Promise<ComplianceCheck[]>;
    /**
     * Close betting for a match
     */
    closeBetting(matchId: string): Promise<void>;
}
export declare const enhancedBettingService: EnhancedBettingService;
export {};
//# sourceMappingURL=EnhancedBettingServiceV2.d.ts.map