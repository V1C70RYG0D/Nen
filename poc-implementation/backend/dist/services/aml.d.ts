/**
 * AML Checker Service - Mock implementation for testing
 * Integrates with EnhancedComplianceService for real AML operations
 */
interface AMLCheckResult {
    flagged: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    reason: string;
    requiresReview: boolean;
}
export declare class AMLChecker {
    private complianceService;
    /**
     * Check for AML compliance on a transaction
     */
    checkTransaction(transaction: {
        userId: string;
        amount: number;
        matchId: string;
    }): Promise<AMLCheckResult>;
    /**
     * Map risk score to defined risk level
     */
    private mapRiskScoreToLevel;
}
export {};
//# sourceMappingURL=aml.d.ts.map