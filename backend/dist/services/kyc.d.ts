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
    checkKYCStatus(userId: string): Promise<KYCVerificationResult>;
    initiateKYCVerification(userId: string, documentType: string): Promise<KYCVerificationResult>;
    upgradeKYCTier(userId: string, targetTier: string): Promise<KYCUpgradeResult>;
    private getKYCReasonMessage;
    private canUpgradeToTier;
    private getUpgradeRequirements;
    private getEstimatedUpgradeTime;
    private generateSessionId;
}
export {};
//# sourceMappingURL=kyc.d.ts.map