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
    private resetMetrics;
    private initializeMLModel;
    private startComplianceMonitoring;
    detectFraud(userId: string, transactionAmount: number, metadata?: any): Promise<FraudDetectionResult>;
    private gatherRiskFactors;
    private calculateBaseRiskScore;
    private applyMLModel;
    private generateRiskFlags;
    private generateRecommendations;
    private determineRiskLevel;
    private shouldBlockTransaction;
    private requiresManualReview;
    private getUserPattern;
    private buildUserPattern;
    private detectUnusualBehavior;
    private assessGeolocationRisk;
    private assessTimePattern;
    private findCommonValues;
    private calculateVariance;
    verifyKYC(userId: string): Promise<KYCVerification>;
    private createInvestigation;
    private updateComplianceMetrics;
    private processInvestigationQueue;
    private processInvestigation;
    private generateComplianceReport;
    private getRiskDistribution;
    private getFlagAnalysis;
    private getComplianceRecommendations;
    getComplianceMetrics(): ComplianceMetrics;
    getActiveInvestigations(): Investigation[];
    shutdown(): Promise<void>;
}
export declare function getEnhancedComplianceService(): EnhancedComplianceService;
export default EnhancedComplianceService;
export { EnhancedComplianceService, ComplianceConfig, FraudDetectionResult, KYCVerification, ComplianceMetrics, Investigation };
//# sourceMappingURL=EnhancedComplianceServiceV2.d.ts.map