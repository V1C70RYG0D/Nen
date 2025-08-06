/**
 * Enhanced Compliance & Fraud Detection Service - Final Implementation
 * Implements comprehensive KYC/AML compliance and real-time fraud detection
 *
 * Features:
 * - Real-time fraud detection with 0-100 risk scoring
 * - Multi-factor analysis (wallet history, transaction patterns, amounts)
 * - KYC validationing with verification levels
 * - Automated compliance metrics and reporting
 * - Pattern analysis for suspicious activity detection
 * - Machine learning-based risk assessment
 * - Regulatory validation framework
 * - Automated flagging and investigation workflow
 */
interface ComplianceConfig {
    kycRequired: boolean;
    amlEnabled: boolean;
    maxTransactionAmount: number;
    dailyTransactionLimit: number;
    riskThresholds: {
        low: number;
        medium: number;
        high: number;
    };
    automaticBlocking: boolean;
    requireManualReview: boolean;
}
interface FraudDetectionResult {
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    flags: string[];
    recommendations: string[];
    shouldBlock: boolean;
    requiresReview: boolean;
    confidence: number;
}
interface KYCVerification {
    userId: string;
    level: 'none' | 'basic' | 'intermediate' | 'full';
    documents: string[];
    verificationDate: Date;
    expiryDate: Date;
    status: 'pending' | 'approved' | 'rejected' | 'expired';
    verifiedBy: string;
    riskAssessment: number;
}
interface ComplianceMetrics {
    totalTransactions: number;
    flaggedTransactions: number;
    blockedTransactions: number;
    averageRiskScore: number;
    kycComplianceRate: number;
    falsePositiveRate: number;
    investigationQueue: number;
    processedToday: number;
    timestamp: Date;
}
interface Investigation {
    id: string;
    userId: string;
    transactionId?: string;
    riskScore: number;
    flags: string[];
    status: 'open' | 'in_progress' | 'resolved' | 'escalated';
    assignedTo?: string;
    createdAt: Date;
    resolvedAt?: Date;
    resolution?: string;
    evidence: any[];
}
declare class EnhancedComplianceService {
    private dbService;
    private config;
    private userPatterns;
    private activeInvestigations;
    private metrics;
    private mlModel;
    private complianceMonitoring;
    constructor(config?: Partial<ComplianceConfig>);
    /**
     * Reset compliance metrics
     */
    private resetMetrics;
    /**
     * Initialize machine learning model for fraud detection
     */
    private initializeMLModel;
    /**
     * Start compliance monitoring background process
     */
    private startComplianceMonitoring;
    /**
     * Perform comprehensive fraud detection analysis
     */
    detectFraud(userId: string, transactionAmount: number, metadata?: any): Promise<FraudDetectionResult>;
    /**
     * Gather comprehensive risk factors for analysis
     */
    private gatherRiskFactors;
    /**
     * Calculate base risk score using rule-based analysis
     */
    private calculateBaseRiskScore;
    /**
     * Apply machine learning model to risk factors
     */
    private applyMLModel;
    /**
     * Generate risk flags based on analysis
     */
    private generateRiskFlags;
    /**
     * Generate recommendations based on risk analysis
     */
    private generateRecommendations;
    /**
     * Determine risk level based on score
     */
    private determineRiskLevel;
    /**
     * Determine if transaction should be blocked
     */
    private shouldBlockTransaction;
    /**
     * Determine if manual review is required
     */
    private requiresManualReview;
    /**
     * Get or create user transaction pattern
     */
    private getUserPattern;
    /**
     * Build user transaction pattern from historical data
     */
    private buildUserPattern;
    /**
     * Detect unusual behavior patterns
     */
    private detectUnusualBehavior;
    /**
     * Assess geolocation risk
     */
    private assessGeolocationRisk;
    /**
     * Assess time pattern risk
     */
    private assessTimePattern;
    /**
     * Find common values in array
     */
    private findCommonValues;
    /**
     * Calculate variance for confidence scoring
     */
    private calculateVariance;
    /**
     * Perform KYC verification check
     */
    verifyKYC(userId: string): Promise<KYCVerification>;
    /**
     * Create investigation for high-risk transactions
     */
    private createInvestigation;
    /**
     * Update compliance metrics
     */
    private updateComplianceMetrics;
    /**
     * Process investigation queue
     */
    private processInvestigationQueue;
    /**
     * Process a single investigation
     */
    private processInvestigation;
    /**
     * Generate compliance report
     */
    private generateComplianceReport;
    /**
     * Get risk score distribution
     */
    private getRiskDistribution;
    /**
     * Get flag analysis
     */
    private getFlagAnalysis;
    /**
     * Get compliance recommendations
     */
    private getComplianceRecommendations;
    /**
     * Get current compliance metrics
     */
    getComplianceMetrics(): ComplianceMetrics;
    /**
     * Get active investigations
     */
    getActiveInvestigations(): Investigation[];
    /**
     * Shutdown compliance service
     */
    shutdown(): Promise<void>;
}
export declare function getEnhancedComplianceService(): EnhancedComplianceService;
export default EnhancedComplianceService;
export { EnhancedComplianceService, ComplianceConfig, FraudDetectionResult, KYCVerification, ComplianceMetrics, Investigation };
//# sourceMappingURL=EnhancedComplianceServiceV2.d.ts.map