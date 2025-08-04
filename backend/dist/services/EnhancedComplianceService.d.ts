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
    detectFraud(walletAddress: string, amount: number, transactionType: string): Promise<FraudDetectionResult>;
    private analyzeAmountRisk;
    private analyzeFrequencyRisk;
    private analyzeBehaviorRisk;
    private checkBlacklist;
    private performBlacklistCheck;
    private getRecommendedAction;
    private calculateConfidence;
    private storeFraudDetectionResult;
    checkKYCCompliance(walletAddress: string): Promise<KYCComplianceCheck>;
    getComplianceMetrics(): Promise<ComplianceMetrics>;
    analyzeTransactionPatterns(walletAddress: string): Promise<TransactionPattern>;
}
export declare const getEnhancedComplianceService: () => EnhancedComplianceService;
export { EnhancedComplianceService, FraudDetectionResult, KYCComplianceCheck, ComplianceMetrics, TransactionPattern };
//# sourceMappingURL=EnhancedComplianceService.d.ts.map