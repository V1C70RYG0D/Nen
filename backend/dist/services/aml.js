"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AMLChecker = void 0;
const EnhancedComplianceService_1 = require("./EnhancedComplianceService");
const logger_1 = require("../middleware/logger");
class AMLChecker {
    complianceService = (0, EnhancedComplianceService_1.getEnhancedComplianceService)();
    async checkTransaction(transaction) {
        try {
            const fraudResult = await this.complianceService.detectFraud(transaction.userId, transaction.amount, 'bet_placement');
            return {
                flagged: fraudResult.recommendedAction === 'block',
                riskLevel: this.mapRiskScoreToLevel(fraudResult.riskScore),
                reason: fraudResult.flaggedReasons.join(', '),
                requiresReview: fraudResult.recommendedAction === 'review'
            };
        }
        catch (error) {
            logger_1.logger.error('AML check failed', { transaction, error });
            return {
                flagged: false,
                riskLevel: 'medium',
                reason: 'AML check system error',
                requiresReview: true
            };
        }
    }
    mapRiskScoreToLevel(score) {
        if (score >= 80) {
            return 'high';
        }
        else if (score >= 50) {
            return 'medium';
        }
        return 'low';
    }
}
exports.AMLChecker = AMLChecker;
//# sourceMappingURL=aml.js.map