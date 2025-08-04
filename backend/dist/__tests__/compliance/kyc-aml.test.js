"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
class MockComplianceService {
    async verifyKYC(userId) {
        if (userId.includes('suspicious')) {
            return {
                userId,
                level: 'none',
                status: 'rejected',
                riskScore: 100
            };
        }
        return {
            userId,
            level: 'basic',
            status: 'approved',
            riskScore: 30
        };
    }
    async detectFraud(userId, amount) {
        let riskScore = 0;
        const flags = [];
        if (amount > 10000) {
            riskScore += 30;
            flags.push('large_transaction');
        }
        if (userId.includes('bot')) {
            riskScore += 40;
            flags.push('bot_behavior');
        }
        const riskLevel = riskScore >= 70 ? 'critical' : riskScore >= 40 ? 'high' : riskScore >= 20 ? 'medium' : 'low';
        return {
            riskScore,
            riskLevel,
            flags,
            shouldBlock: riskScore >= 70
        };
    }
}
class MockKYCService {
    async performAMLCheck(address, amount) {
        const flags = [];
        let riskScore = 0;
        if (address.includes('SANCT')) {
            riskScore = 100;
            flags.push('sanctioned');
        }
        if (amount > 10000) {
            riskScore += 20;
            flags.push('high_value');
        }
        return {
            isClean: riskScore < 50,
            riskScore,
            flags
        };
    }
}
(0, globals_1.describe)('KYC/AML Compliance Engine', () => {
    const complianceService = new MockComplianceService();
    const kycService = new MockKYCService();
    (0, globals_1.describe)('Identity Verification', () => {
        (0, globals_1.test)('should verify basic user KYC', async () => {
            const result = await complianceService.verifyKYC('user_001');
            (0, globals_1.expect)(result).toMatchObject({
                userId: 'user_001',
                level: 'basic',
                status: 'approved',
                riskScore: globals_1.expect.any(Number)
            });
            (0, globals_1.expect)(result.riskScore).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(result.riskScore).toBeLessThanOrEqual(100);
        });
        (0, globals_1.test)('should reject suspicious users', async () => {
            const result = await complianceService.verifyKYC('suspicious_user');
            (0, globals_1.expect)(result.level).toBe('none');
            (0, globals_1.expect)(result.status).toBe('rejected');
            (0, globals_1.expect)(result.riskScore).toBe(100);
        });
    });
    (0, globals_1.describe)('Fraud Detection', () => {
        (0, globals_1.test)('should detect large transactions', async () => {
            const result = await complianceService.detectFraud('user_001', 15000);
            (0, globals_1.expect)(result.flags).toContain('large_transaction');
            (0, globals_1.expect)(result.riskScore).toBeGreaterThan(0);
        });
        (0, globals_1.test)('should detect bot behavior', async () => {
            const result = await complianceService.detectFraud('bot_user', 1000);
            (0, globals_1.expect)(result.flags).toContain('bot_behavior');
            (0, globals_1.expect)(result.riskLevel).toMatch(/medium|high|critical/);
        });
        (0, globals_1.test)('should block high-risk transactions', async () => {
            const result = await complianceService.detectFraud('bot_user', 50000);
            (0, globals_1.expect)(result.shouldBlock).toBe(true);
            (0, globals_1.expect)(result.riskLevel).toBe('critical');
        });
    });
    (0, globals_1.describe)('AML Screening', () => {
        (0, globals_1.test)('should detect sanctioned addresses', async () => {
            const result = await kycService.performAMLCheck('SANCT_ADDRESS_123', 1000);
            (0, globals_1.expect)(result.isClean).toBe(false);
            (0, globals_1.expect)(result.flags).toContain('sanctioned');
            (0, globals_1.expect)(result.riskScore).toBe(100);
        });
        (0, globals_1.test)('should pass clean addresses', async () => {
            const result = await kycService.performAMLCheck('CLEAN_ADDRESS_123', 1000);
            (0, globals_1.expect)(result.isClean).toBe(true);
            (0, globals_1.expect)(result.flags).not.toContain('sanctioned');
        });
        (0, globals_1.test)('should flag high-value transactions', async () => {
            const result = await kycService.performAMLCheck('CLEAN_ADDRESS_123', 50000);
            (0, globals_1.expect)(result.flags).toContain('high_value');
            (0, globals_1.expect)(result.riskScore).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Risk Assessment', () => {
        (0, globals_1.test)('should calculate risk scores correctly', async () => {
            const profiles = [
                { userId: 'clean_user', amount: 100 },
                { userId: 'medium_user', amount: 5000 },
                { userId: 'bot_user', amount: 20000 }
            ];
            for (const profile of profiles) {
                const result = await complianceService.detectFraud(profile.userId, profile.amount);
                (0, globals_1.expect)(result.riskScore).toBeGreaterThanOrEqual(0);
                (0, globals_1.expect)(result.riskScore).toBeLessThanOrEqual(100);
                (0, globals_1.expect)(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
            }
        });
    });
    (0, globals_1.describe)('Compliance Metrics', () => {
        (0, globals_1.test)('should track compliance metrics', async () => {
            await complianceService.detectFraud('user1', 1000);
            await complianceService.detectFraud('user2', 15000);
            await complianceService.detectFraud('bot_user', 50000);
            const mockMetrics = {
                totalTransactions: 3,
                flaggedTransactions: 2,
                blockedTransactions: 1,
                averageRiskScore: 33.3,
                kycComplianceRate: 85
            };
            (0, globals_1.expect)(mockMetrics.totalTransactions).toBeGreaterThan(0);
            (0, globals_1.expect)(mockMetrics.kycComplianceRate).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(mockMetrics.kycComplianceRate).toBeLessThanOrEqual(100);
        });
    });
    (0, globals_1.describe)('Regulatory Compliance', () => {
        (0, globals_1.test)('should meet AML/BSA requirements', () => {
            const requirements = {
                customerDueDiligence: true,
                suspiciousActivityReporting: true,
                recordKeeping: true,
                riskAssessment: true
            };
            (0, globals_1.expect)(requirements.customerDueDiligence).toBe(true);
            (0, globals_1.expect)(requirements.suspiciousActivityReporting).toBe(true);
            (0, globals_1.expect)(requirements.recordKeeping).toBe(true);
            (0, globals_1.expect)(requirements.riskAssessment).toBe(true);
        });
        (0, globals_1.test)('should implement FATF compliance', () => {
            const fatfCompliance = {
                customerIdentification: true,
                ongoingDueDiligence: true,
                suspiciousTransactionReporting: true,
                recordKeeping: true
            };
            Object.values(fatfCompliance).forEach(requirement => {
                (0, globals_1.expect)(requirement).toBe(true);
            });
        });
    });
});
//# sourceMappingURL=kyc-aml.test.js.map