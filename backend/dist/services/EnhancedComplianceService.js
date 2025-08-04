"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedComplianceService = exports.getEnhancedComplianceService = void 0;
const logger_1 = require("../middleware/logger");
const EnhancedDatabaseService_1 = require("./EnhancedDatabaseService");
class EnhancedComplianceService {
    dbService;
    riskThresholds = {
        low: 30,
        medium: 60,
        high: 80
    };
    constructor() {
        this.dbService = (0, EnhancedDatabaseService_1.getEnhancedDatabaseService)();
    }
    async detectFraud(walletAddress, amount, transactionType) {
        const flaggedReasons = [];
        let riskScore = 0;
        try {
            const amountRisk = await this.analyzeAmountRisk(walletAddress, amount);
            riskScore += amountRisk.score;
            if (amountRisk.flagged) {
                flaggedReasons.push(amountRisk.reason);
            }
            const frequencyRisk = await this.analyzeFrequencyRisk(walletAddress);
            riskScore += frequencyRisk.score;
            if (frequencyRisk.flagged) {
                flaggedReasons.push(frequencyRisk.reason);
            }
            const behaviorRisk = await this.analyzeBehaviorRisk(walletAddress);
            riskScore += behaviorRisk.score;
            if (behaviorRisk.flagged) {
                flaggedReasons.push(behaviorRisk.reason);
            }
            const blacklistRisk = await this.checkBlacklist(walletAddress);
            riskScore += blacklistRisk.score;
            if (blacklistRisk.flagged) {
                flaggedReasons.push(blacklistRisk.reason);
            }
            riskScore = Math.min(100, riskScore);
            const result = {
                riskScore,
                isHighRisk: riskScore >= this.riskThresholds.high,
                flaggedReasons,
                recommendedAction: this.getRecommendedAction(riskScore),
                confidence: this.calculateConfidence(flaggedReasons.length, riskScore)
            };
            if (result.isHighRisk) {
                logger_1.logger.warn('High-risk transaction detected', {
                    walletAddress,
                    amount,
                    transactionType,
                    riskScore,
                    flaggedReasons,
                    recommendedAction: result.recommendedAction
                });
            }
            await this.storeFraudDetectionResult(walletAddress, result, transactionType);
            return result;
        }
        catch (error) {
            logger_1.logger.error('Fraud detection failed', {
                walletAddress,
                amount,
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                riskScore: 100,
                isHighRisk: true,
                flaggedReasons: ['System error during fraud detection'],
                recommendedAction: 'review',
                confidence: 0
            };
        }
    }
    async analyzeAmountRisk(walletAddress, amount) {
        const userStats = await this.dbService.cachedQuery(`user_stats:${walletAddress}`, async () => {
            return this.dbService.getPrismaClient().user.findUnique({
                where: { wallet_address: walletAddress },
                include: {
                    bets: {
                        select: { amount: true },
                        orderBy: { created_at: 'desc' },
                        take: 50
                    }
                }
            });
        }, 300);
        if (!userStats || userStats.bets.length === 0) {
            if (amount > 10) {
                return { score: 40, flagged: true, reason: 'Large amount for new user' };
            }
            return { score: 10, flagged: false, reason: '' };
        }
        const averageAmount = userStats.bets.reduce((sum, bet) => sum + bet.amount, 0) / userStats.bets.length;
        const maxAmount = Math.max(...userStats.bets.map((bet) => bet.amount));
        if (amount > averageAmount * 10) {
            return { score: 50, flagged: true, reason: 'Amount 10x higher than user average' };
        }
        if (amount > maxAmount * 3) {
            return { score: 30, flagged: true, reason: 'Amount 3x higher than user maximum' };
        }
        if (amount > 100) {
            return { score: 25, flagged: true, reason: 'Very large transaction amount' };
        }
        return { score: 5, flagged: false, reason: '' };
    }
    async analyzeFrequencyRisk(walletAddress) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentTransactions = await this.dbService.getPrismaClient().bet.count({
            where: {
                user: { wallet_address: walletAddress },
                created_at: { gte: oneHourAgo }
            }
        });
        if (recentTransactions > 20) {
            return { score: 40, flagged: true, reason: 'Excessive transaction frequency' };
        }
        if (recentTransactions > 10) {
            return { score: 20, flagged: true, reason: 'High transaction frequency' };
        }
        return { score: 0, flagged: false, reason: '' };
    }
    async analyzeBehaviorRisk(walletAddress) {
        const user = await this.dbService.getPrismaClient().user.findUnique({
            where: { wallet_address: walletAddress },
            include: {
                bets: {
                    select: { created_at: true, amount: true },
                    orderBy: { created_at: 'desc' },
                    take: 100
                }
            }
        });
        if (!user || user.bets.length < 5) {
            return { score: 0, flagged: false, reason: '' };
        }
        const intervals = [];
        for (let i = 1; i < user.bets.length; i++) {
            const interval = user.bets[i - 1].created_at.getTime() - user.bets[i].created_at.getTime();
            intervals.push(interval);
        }
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);
        if (stdDev < avgInterval * 0.1 && intervals.length > 10) {
            return { score: 35, flagged: true, reason: 'Bot-like transaction patterns detected' };
        }
        const roundNumbers = user.bets.filter((bet) => bet.amount % 1 === 0).length;
        const roundRatio = roundNumbers / user.bets.length;
        if (roundRatio > 0.9 && user.bets.length > 20) {
            return { score: 25, flagged: true, reason: 'Suspicious round number usage pattern' };
        }
        return { score: 0, flagged: false, reason: '' };
    }
    async checkBlacklist(walletAddress) {
        const isBlacklisted = await this.performBlacklistCheck(walletAddress);
        if (isBlacklisted) {
            return { score: 100, flagged: true, reason: 'Wallet address on blacklist' };
        }
        return { score: 0, flagged: false, reason: '' };
    }
    async performBlacklistCheck(walletAddress) {
        const blacklistPatterns = [
            /^1{40,}/,
            /^0{40,}/,
            /test/i,
            /demo/i
        ];
        return blacklistPatterns.some(pattern => pattern.test(walletAddress));
    }
    getRecommendedAction(riskScore) {
        if (riskScore >= this.riskThresholds.high) {
            return 'block';
        }
        else if (riskScore >= this.riskThresholds.medium) {
            return 'review';
        }
        return 'allow';
    }
    calculateConfidence(flagCount, riskScore) {
        const baseConfidence = 0.7;
        const flagBonus = flagCount * 0.05;
        const scoreBonus = (riskScore / 100) * 0.2;
        return Math.min(1.0, baseConfidence + flagBonus + scoreBonus);
    }
    async storeFraudDetectionResult(walletAddress, result, transactionType) {
        try {
            await this.dbService.getPrismaClient().$executeRaw `
        INSERT INTO fraud_detections (wallet_address, risk_score, flagged_reasons, recommended_action, transaction_type, created_at)
        VALUES (${walletAddress}, ${result.riskScore}, ${JSON.stringify(result.flaggedReasons)}, ${result.recommendedAction}, ${transactionType}, NOW())
      `;
        }
        catch (error) {
            logger_1.logger.error('Failed to store fraud detection result', {
                walletAddress,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async checkKYCCompliance(walletAddress) {
        try {
            const user = await this.dbService.getPrismaClient().user.findUnique({
                where: { wallet_address: walletAddress },
                select: {
                    kyc_status: true,
                    kyc_verified_at: true,
                    verification_level: true
                }
            });
            const now = new Date();
            const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
            return {
                walletAddress,
                isCompliant: user?.kyc_status === 'approved',
                status: user?.kyc_status || 'pending',
                verificationLevel: user?.verification_level || 'basic',
                lastCheck: user?.kyc_verified_at || now,
                expiryDate: oneYearFromNow,
                documents: []
            };
        }
        catch (error) {
            logger_1.logger.error('KYC compliance check failed', {
                walletAddress,
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                walletAddress,
                isCompliant: false,
                status: 'pending',
                verificationLevel: 'basic',
                lastCheck: new Date(),
                expiryDate: new Date(),
                documents: []
            };
        }
    }
    async getComplianceMetrics() {
        try {
            const [totalUsers, compliantUsers, flaggedTransactions] = await Promise.all([
                this.dbService.getPrismaClient().user.count(),
                this.dbService.getPrismaClient().user.count({
                    where: { kyc_status: 'approved' }
                }),
                this.dbService.getPrismaClient().$queryRaw `
          SELECT COUNT(*) as count FROM fraud_detections 
          WHERE risk_score >= ${this.riskThresholds.medium}
          AND created_at >= NOW() - INTERVAL '24 hours'
        `
            ]);
            const complianceRate = totalUsers > 0 ? (compliantUsers / totalUsers) * 100 : 0;
            return {
                totalUsers,
                compliantUsers,
                pendingVerifications: totalUsers - compliantUsers,
                flaggedTransactions: flaggedTransactions[0]?.count || 0,
                blockedTransactions: 0,
                averageRiskScore: 15,
                complianceRate
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get compliance metrics', {
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                totalUsers: 0,
                compliantUsers: 0,
                pendingVerifications: 0,
                flaggedTransactions: 0,
                blockedTransactions: 0,
                averageRiskScore: 0,
                complianceRate: 0
            };
        }
    }
    async analyzeTransactionPatterns(walletAddress) {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const transactions = await this.dbService.getPrismaClient().bet.findMany({
            where: {
                user: { wallet_address: walletAddress },
                created_at: { gte: oneWeekAgo }
            },
            select: {
                amount: true,
                created_at: true
            },
            orderBy: { created_at: 'desc' }
        });
        if (transactions.length === 0) {
            return {
                walletAddress,
                totalTransactions: 0,
                totalVolume: 0,
                averageAmount: 0,
                maxAmount: 0,
                timeSpan: 0,
                frequency: 0,
                isAnomalous: false
            };
        }
        const totalVolume = transactions.reduce((sum, tx) => sum + tx.amount, 0);
        const averageAmount = totalVolume / transactions.length;
        const maxAmount = Math.max(...transactions.map((tx) => tx.amount));
        const timeSpan = (transactions[0].created_at.getTime() - transactions[transactions.length - 1].created_at.getTime()) / (1000 * 60);
        const frequency = timeSpan > 0 ? (transactions.length / timeSpan) * 60 : 0;
        const isAnomalous = frequency > 5 ||
            maxAmount > averageAmount * 20 ||
            transactions.length > 100;
        return {
            walletAddress,
            totalTransactions: transactions.length,
            totalVolume,
            averageAmount,
            maxAmount,
            timeSpan,
            frequency,
            isAnomalous
        };
    }
}
exports.EnhancedComplianceService = EnhancedComplianceService;
let complianceService;
const getEnhancedComplianceService = () => {
    if (!complianceService) {
        complianceService = new EnhancedComplianceService();
    }
    return complianceService;
};
exports.getEnhancedComplianceService = getEnhancedComplianceService;
//# sourceMappingURL=EnhancedComplianceService.js.map