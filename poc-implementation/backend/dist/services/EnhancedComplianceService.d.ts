/**
 * Enhanced Compliance and Fraud Detection Service
 * Implements KYC/AML compliance and fraud detection requirements
 *
 * Features:
 * - Real-time fraud detection
 * - KYC/AML validationing
 * - Risk scoring and monitoring
 * - Automated reporting
 * - Transaction pattern analysis
 */
interface FraudDetectionResult {
    riskScore: number;
    isHighRisk: boolean;
    flaggedReasons: string[];
    recommendedAction: 'allow' | 'review' | 'block';
    confidence: number;
}
interface KYCComplianceCheck {
    walletAddress: string;
    isCompliant: boolean;
    status: 'pending' | 'approved' | 'rejected' | 'expired';
    verificationLevel: 'basic' | 'enhanced' | 'premium';
    lastCheck: Date;
    expiryDate: Date;
    documents: string[];
}
interface ComplianceMetrics {
    totalUsers: number;
    compliantUsers: number;
    pendingVerifications: number;
    flaggedTransactions: number;
    blockedTransactions: number;
    averageRiskScore: number;
    complianceRate: number;
}
interface TransactionPattern {
    walletAddress: string;
    totalTransactions: number;
    totalVolume: number;
    averageAmount: number;
    maxAmount: number;
    timeSpan: number;
    frequency: number;
    isAnomalous: boolean;
}
declare class EnhancedComplianceService {
    private dbService;
    private riskThresholds;
    constructor();
    /**
     * Perform comprehensive fraud detection on a transaction
     */
    detectFraud(walletAddress: string, amount: number, transactionType: string): Promise<FraudDetectionResult>;
    /**
     * Analyze amount-based risk factors
     */
    private analyzeAmountRisk;
    /**
     * Analyze frequency-based risk factors
     */
    private analyzeFrequencyRisk;
    /**
     * Analyze behavior-based risk factors
     */
    private analyzeBehaviorRisk;
    /**
     * Check against blacklist
     */
    private checkBlacklist;
    /**
     * Perform actual blacklist validation
     */
    private performBlacklistCheck;
    /**
     * Get recommended action based on risk score
     */
    private getRecommendedAction;
    /**
     * Calculate confidence score
     */
    private calculateConfidence;
    /**
     * Store fraud detection result
     */
    private storeFraudDetectionResult;
    /**
     * Perform KYC validation
     */
    checkKYCCompliance(walletAddress: string): Promise<KYCComplianceCheck>;
    /**
     * Get compliance metrics
     */
    getComplianceMetrics(): Promise<ComplianceMetrics>;
    /**
     * Analyze transaction patterns for a user
     */
    analyzeTransactionPatterns(walletAddress: string): Promise<TransactionPattern>;
}
export declare const getEnhancedComplianceService: () => EnhancedComplianceService;
export { EnhancedComplianceService, FraudDetectionResult, KYCComplianceCheck, ComplianceMetrics, TransactionPattern };
//# sourceMappingURL=EnhancedComplianceService.d.ts.map