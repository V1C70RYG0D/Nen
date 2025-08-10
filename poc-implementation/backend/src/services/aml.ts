/**
 * AML Checker Service - Mock implementation for testing
 * Integrates with EnhancedComplianceService for real AML operations
 */

import { getEnhancedComplianceService } from './EnhancedComplianceService';
import { logger } from '../middleware/logger';

interface AMLCheckResult {
  flagged: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  reason: string;
  requiresReview: boolean;
}

export class AMLChecker {
  private complianceService = getEnhancedComplianceService();

  /**
   * Check for AML compliance on a transaction
   */
  async checkTransaction(transaction: {
    userId: string;
    amount: number;
    matchId: string;
  }): Promise<AMLCheckResult> {
    try {
      // This would integrate with real AML providers for risk assessment
      const fraudResult = await this.complianceService.detectFraud(
        transaction.userId,
        transaction.amount,
        'bet_placement'
      );

      return {
        flagged: fraudResult.recommendedAction === 'block',
        riskLevel: this.mapRiskScoreToLevel(fraudResult.riskScore),
        reason: fraudResult.flaggedReasons.join(', '),
        requiresReview: fraudResult.recommendedAction === 'review'
      };
    } catch (error) {
      logger.error('AML check failed', { transaction, error });
      return {
        flagged: false,
        riskLevel: 'medium',
        reason: 'AML check system error',
        requiresReview: true
      };
    }
  }

  /**
   * Map risk score to defined risk level
   */
  private mapRiskScoreToLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 80) {
      return 'high';
    } else if (score >= 50) {
      return 'medium';
    }
    return 'low';
  }
}
