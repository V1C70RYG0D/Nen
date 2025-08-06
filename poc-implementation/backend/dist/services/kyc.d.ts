/**
 * KYC Provider Service - Mock implementation for testing
 * Integrates with EnhancedComplianceService for real KYC operations
 */
interface KYCVerificationResult {
    status: 'verified' | 'pending' | 'rejected';
    tier: 'none' | 'basic' | 'verified' | 'premium';
    reason: string;
    requiresDocuments: boolean;
    nextStepUrl?: string;
}
interface KYCUpgradeResult {
    success: boolean;
    newTier: string;
    requirements: string[];
    estimatedTime: string;
}
export declare class KYCProvider {
    private complianceService;
    /**
     * Check KYC status for a user
     */
    checkKYCStatus(userId: string): Promise<KYCVerificationResult>;
    /**
     * Initiate KYC verification process
     */
    initiateKYCVerification(userId: string, documentType: string): Promise<KYCVerificationResult>;
    /**
     * Upgrade KYC tier
     */
    upgradeKYCTier(userId: string, targetTier: string): Promise<KYCUpgradeResult>;
    private getKYCReasonMessage;
    private canUpgradeToTier;
    private getUpgradeRequirements;
    private getEstimatedUpgradeTime;
    private generateSessionId;
}
export {};
//# sourceMappingURL=kyc.d.ts.map