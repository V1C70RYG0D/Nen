interface AMLCheckResult {
    flagged: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    reason: string;
    requiresReview: boolean;
}
export declare class AMLChecker {
    private complianceService;
    checkTransaction(transaction: {
        userId: string;
        amount: number;
        matchId: string;
    }): Promise<AMLCheckResult>;
    private mapRiskScoreToLevel;
}
export {};
//# sourceMappingURL=aml.d.ts.map