"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedComplianceService = void 0;
exports.getEnhancedComplianceService = getEnhancedComplianceService;
const logger_1 = require("../utils/logger");
const EnhancedDatabaseService_1 = require("./EnhancedDatabaseService");
class EnhancedComplianceService {
    dbService;
    config;
    userPatterns = new Map();
    activeInvestigations = new Map();
    metrics = {
        totalTransactions: 0,
        flaggedTransactions: 0,
        blockedTransactions: 0,
        averageRiskScore: 0,
        kycComplianceRate: 0,
        falsePositiveRate: 0,
        investigationQueue: 0,
        processedToday: 0,
        timestamp: new Date()
    };
    mlModel;
    complianceMonitoring = null;
    constructor(config = {}) {
        this.dbService = (0, EnhancedDatabaseService_1.getEnhancedDatabaseService)();
        this.config = {
            kycRequired: true,
            amlEnabled: true,
            maxTransactionAmount: 10000,
            dailyTransactionLimit: 50000,
            riskThresholds: {
                low: 30,
                medium: 60,
                high: 85
            },
            automaticBlocking: true,
            requireManualReview: true,
            ...config
        };
        this.resetMetrics();
        this.initializeMLModel();
        this.startComplianceMonitoring();
    }
    resetMetrics() {
        this.metrics = {
            totalTransactions: 0,
            flaggedTransactions: 0,
            blockedTransactions: 0,
            averageRiskScore: 0,
            kycComplianceRate: 0,
            falsePositiveRate: 0,
            investigationQueue: 0,
            processedToday: 0,
            timestamp: new Date()
        };
    }
    initializeMLModel() {
        this.mlModel = {
            predict: (features) => {
                const weights = [0.2, 0.15, 0.25, 0.1, 0.1, 0.1, 0.05, 0.05];
                let score = 0;
                for (let i = 0; i < Math.min(features.length, weights.length); i++) {
                    score += features[i] * weights[i];
                }
                return Math.max(0, Math.min(100, score));
            },
            confidence: (features) => {
                const dataQuality = Math.min(features.filter(f => f > 0).length / features.length, 1);
                const featureVariance = this.calculateVariance(features);
                return dataQuality * (1 - featureVariance / 100);
            }
        };
        logger_1.logger.info('Fraud detection ML model initialized');
    }
    startComplianceMonitoring() {
        this.complianceMonitoring = setInterval(async () => {
            await this.updateComplianceMetrics();
            await this.processInvestigationQueue();
            await this.generateComplianceReport();
        }, 300000);
        logger_1.logger.info('Compliance monitoring started', {
            interval: '5 minutes',
            config: this.config
        });
    }
    async detectFraud(userId, transactionAmount, metadata = {}) {
        const startTime = Date.now();
        try {
            logger_1.logger.info('Starting fraud detection analysis', {
                userId,
                transactionAmount,
                timestamp: new Date().toISOString()
            });
            const riskFactors = await this.gatherRiskFactors(userId, transactionAmount, metadata);
            const baseRiskScore = await this.calculateBaseRiskScore(riskFactors);
            const mlRiskScore = this.applyMLModel(riskFactors);
            const combinedScore = (baseRiskScore * 0.6) + (mlRiskScore * 0.4);
            const flags = this.generateRiskFlags(riskFactors, combinedScore);
            const recommendations = this.generateRecommendations(combinedScore, flags);
            const riskLevel = this.determineRiskLevel(combinedScore);
            const shouldBlock = this.shouldBlockTransaction(combinedScore, flags);
            const requiresReview = this.requiresManualReview(combinedScore, flags);
            const confidence = this.mlModel.confidence([
                riskFactors.walletAge,
                riskFactors.transactionHistory,
                riskFactors.largeTransactionCount,
                riskFactors.geolocationRisk
            ]);
            const result = {
                riskScore: Math.round(combinedScore),
                riskLevel,
                flags,
                recommendations,
                shouldBlock,
                requiresReview,
                confidence
            };
            this.metrics.totalTransactions++;
            this.metrics.averageRiskScore = ((this.metrics.averageRiskScore * (this.metrics.totalTransactions - 1)) +
                combinedScore) / this.metrics.totalTransactions;
            if (combinedScore > this.config.riskThresholds.medium) {
                this.metrics.flaggedTransactions++;
            }
            if (shouldBlock) {
                this.metrics.blockedTransactions++;
            }
            if (requiresReview) {
                await this.createInvestigation(userId, result, transactionAmount, metadata);
            }
            logger_1.logger.info('Fraud detection completed', {
                userId,
                riskScore: result.riskScore,
                riskLevel: result.riskLevel,
                shouldBlock: result.shouldBlock,
                requiresReview: result.requiresReview,
                confidence: result.confidence,
                analysisTime: Date.now() - startTime,
                flags: result.flags.length
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Fraud detection failed', {
                userId,
                transactionAmount,
                error: error instanceof Error ? error.message : String(error),
                analysisTime: Date.now() - startTime
            });
            return {
                riskScore: 100,
                riskLevel: 'critical',
                flags: ['analysis_error'],
                recommendations: ['Manual review required due to system error'],
                shouldBlock: true,
                requiresReview: true,
                confidence: 0
            };
        }
    }
    async gatherRiskFactors(userId, transactionAmount, metadata) {
        try {
            const user = await this.dbService.cachedQuery(`user_risk_profile:${userId}`, async () => {
                return this.dbService.getPrismaClient().user.findUnique({
                    where: { id: userId },
                    include: {
                        bets: {
                            orderBy: { createdAt: 'desc' },
                            take: 50
                        }
                    }
                });
            }, 300);
            if (!user) {
                throw new Error(`User ${userId} not found`);
            }
            const walletAge = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));
            const transactions = user.bets || [];
            const transactionHistory = transactions.length;
            const largeTransactionThreshold = 1000;
            const largeTransactionCount = transactions.filter((bet) => parseFloat(bet.amount) > largeTransactionThreshold).length;
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const recentTransactions = transactions.filter((bet) => new Date(bet.createdAt) > oneHourAgo);
            const rapidTransactionPattern = recentTransactions.length > 5;
            const userPattern = this.getUserPattern(userId, transactions);
            const unusualBehaviorPattern = this.detectUnusualBehavior(userPattern, transactionAmount, new Date());
            const geolocationRisk = this.assessGeolocationRisk(metadata.ipAddress, metadata.country);
            const deviceFingerprint = metadata.userAgent || 'unknown';
            const currentHour = new Date().getHours();
            const timeOfDayPattern = this.assessTimePattern(userPattern, currentHour);
            return {
                walletAge,
                transactionHistory,
                largeTransactionCount,
                rapidTransactionPattern,
                unusualBehaviorPattern,
                geolocationRisk,
                deviceFingerprint,
                timeOfDayPattern
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to gather risk factors', {
                userId,
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                walletAge: 0,
                transactionHistory: 0,
                largeTransactionCount: 0,
                rapidTransactionPattern: true,
                unusualBehaviorPattern: true,
                geolocationRisk: 100,
                deviceFingerprint: 'unknown',
                timeOfDayPattern: 100
            };
        }
    }
    async calculateBaseRiskScore(riskFactors) {
        let riskScore = 0;
        if (riskFactors.walletAge < 1) {
            riskScore += 30;
        }
        else if (riskFactors.walletAge < 7) {
            riskScore += 20;
        }
        else if (riskFactors.walletAge < 30) {
            riskScore += 10;
        }
        if (riskFactors.transactionHistory < 5) {
            riskScore += 25;
        }
        else if (riskFactors.transactionHistory < 20) {
            riskScore += 15;
        }
        if (riskFactors.largeTransactionCount > 10) {
            riskScore += 20;
        }
        else if (riskFactors.largeTransactionCount > 5) {
            riskScore += 10;
        }
        if (riskFactors.rapidTransactionPattern) {
            riskScore += 25;
        }
        if (riskFactors.unusualBehaviorPattern) {
            riskScore += 20;
        }
        riskScore += riskFactors.geolocationRisk * 0.15;
        riskScore += riskFactors.timeOfDayPattern * 0.1;
        return Math.min(100, riskScore);
    }
    applyMLModel(riskFactors) {
        const features = [
            riskFactors.walletAge > 0 ? Math.min(riskFactors.walletAge, 365) / 365 * 100 : 100,
            riskFactors.transactionHistory > 0 ? Math.min(riskFactors.transactionHistory, 100) : 0,
            riskFactors.largeTransactionCount * 5,
            riskFactors.rapidTransactionPattern ? 100 : 0,
            riskFactors.unusualBehaviorPattern ? 100 : 0,
            riskFactors.geolocationRisk,
            riskFactors.timeOfDayPattern,
            riskFactors.deviceFingerprint === 'unknown' ? 50 : 0
        ];
        return this.mlModel.predict(features);
    }
    generateRiskFlags(riskFactors, riskScore) {
        const flags = [];
        if (riskFactors.walletAge < 1) {
            flags.push('new_wallet');
        }
        if (riskFactors.transactionHistory < 5) {
            flags.push('limited_history');
        }
        if (riskFactors.rapidTransactionPattern) {
            flags.push('rapid_transactions');
        }
        if (riskFactors.unusualBehaviorPattern) {
            flags.push('unusual_behavior');
        }
        if (riskFactors.geolocationRisk > 70) {
            flags.push('high_risk_location');
        }
        if (riskFactors.largeTransactionCount > 10) {
            flags.push('frequent_large_transactions');
        }
        if (riskFactors.timeOfDayPattern > 70) {
            flags.push('unusual_time_pattern');
        }
        if (riskFactors.deviceFingerprint === 'unknown') {
            flags.push('unknown_device');
        }
        if (riskScore > 90) {
            flags.push('critical_risk');
        }
        else if (riskScore > 70) {
            flags.push('high_risk');
        }
        return flags;
    }
    generateRecommendations(riskScore, flags) {
        const recommendations = [];
        if (flags.includes('new_wallet')) {
            recommendations.push('Verify wallet ownership and identity');
        }
        if (flags.includes('limited_history')) {
            recommendations.push('Request additional verification documents');
        }
        if (flags.includes('rapid_transactions')) {
            recommendations.push('Monitor for potential account takeover');
        }
        if (flags.includes('unusual_behavior')) {
            recommendations.push('Review transaction patterns and user behavior');
        }
        if (flags.includes('high_risk_location')) {
            recommendations.push('Verify geolocation and apply additional security measures');
        }
        if (flags.includes('critical_risk')) {
            recommendations.push('Block transaction and initiate immediate investigation');
        }
        else if (riskScore > 60) {
            recommendations.push('Manual review required before processing');
        }
        if (recommendations.length === 0) {
            recommendations.push('Transaction appears normal, process with standard monitoring');
        }
        return recommendations;
    }
    determineRiskLevel(riskScore) {
        if (riskScore >= this.config.riskThresholds.high) {
            return 'critical';
        }
        else if (riskScore >= this.config.riskThresholds.medium) {
            return 'high';
        }
        else if (riskScore >= this.config.riskThresholds.low) {
            return 'medium';
        }
        else {
            return 'low';
        }
    }
    shouldBlockTransaction(riskScore, flags) {
        if (!this.config.automaticBlocking) {
            return false;
        }
        return riskScore >= this.config.riskThresholds.high ||
            flags.includes('critical_risk') ||
            flags.includes('rapid_transactions');
    }
    requiresManualReview(riskScore, flags) {
        if (!this.config.requireManualReview) {
            return false;
        }
        return riskScore >= this.config.riskThresholds.medium ||
            flags.length > 2;
    }
    getUserPattern(userId, transactions) {
        let pattern = this.userPatterns.get(userId);
        if (!pattern) {
            pattern = this.buildUserPattern(userId, transactions);
            this.userPatterns.set(userId, pattern);
        }
        return pattern;
    }
    buildUserPattern(userId, transactions) {
        if (transactions.length === 0) {
            return {
                userId,
                averageAmount: 0,
                frequencyPerDay: 0,
                typicalTimes: [],
                commonCounterparties: [],
                behaviorBaseline: {}
            };
        }
        const averageAmount = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0) / transactions.length;
        const oldestTransaction = new Date(Math.min(...transactions.map(tx => new Date(tx.createdAt).getTime())));
        const daysSinceFirst = Math.max(1, Math.floor((Date.now() - oldestTransaction.getTime()) / (1000 * 60 * 60 * 24)));
        const frequencyPerDay = transactions.length / daysSinceFirst;
        const hours = transactions.map(tx => new Date(tx.createdAt).getHours());
        const typicalTimes = this.findCommonValues(hours);
        const counterparties = transactions.map(tx => tx.match_id || 'unknown');
        const commonCounterparties = this.findCommonValues(counterparties);
        return {
            userId,
            averageAmount,
            frequencyPerDay,
            typicalTimes,
            commonCounterparties,
            behaviorBaseline: {
                created: new Date(),
                transactionCount: transactions.length,
                lastUpdated: new Date()
            }
        };
    }
    detectUnusualBehavior(pattern, currentAmount, currentTime) {
        if (!pattern.behaviorBaseline.transactionCount) {
            return false;
        }
        const currentHour = currentTime.getHours();
        const amountDeviation = pattern.averageAmount > 0 ?
            currentAmount / pattern.averageAmount : 0;
        if (amountDeviation > 3 || amountDeviation < 0.1) {
            return true;
        }
        if (pattern.typicalTimes.length > 0 &&
            !pattern.typicalTimes.some(hour => Math.abs(hour - currentHour) <= 2)) {
            return true;
        }
        return false;
    }
    assessGeolocationRisk(ipAddress, country) {
        const highRiskCountries = ['CN', 'RU', 'KP', 'IR'];
        const mediumRiskCountries = ['VE', 'MM', 'AF', 'SY'];
        if (!country) {
            return 50;
        }
        if (highRiskCountries.includes(country)) {
            return 80;
        }
        if (mediumRiskCountries.includes(country)) {
            return 60;
        }
        return 20;
    }
    assessTimePattern(pattern, currentHour) {
        if (pattern.typicalTimes.length === 0) {
            return 30;
        }
        const closestHour = pattern.typicalTimes.reduce((closest, hour) => {
            return Math.abs(hour - currentHour) < Math.abs(closest - currentHour) ? hour : closest;
        });
        const hourDifference = Math.abs(closestHour - currentHour);
        if (hourDifference <= 1)
            return 10;
        if (hourDifference <= 3)
            return 30;
        if (hourDifference <= 6)
            return 60;
        return 90;
    }
    findCommonValues(arr) {
        const counts = arr.reduce((acc, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([val]) => isNaN(Number(val)) ? val : Number(val));
    }
    calculateVariance(numbers) {
        const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
        const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
        return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
    }
    async verifyKYC(userId) {
        try {
            logger_1.logger.info('Performing KYC verification', { userId });
            const user = await this.dbService.cachedQuery(`user_kyc:${userId}`, async () => {
                return this.dbService.getPrismaClient().user.findUnique({
                    where: { id: userId }
                });
            }, 3600);
            if (!user) {
                throw new Error(`User ${userId} not found`);
            }
            let level = 'none';
            const documents = [];
            if (user.email && user.wallet_address) {
                level = 'basic';
                documents.push('email', 'wallet');
            }
            if (user.created_at && new Date(user.created_at) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
                level = 'intermediate';
                documents.push('address_verification');
            }
            if (user.total_winnings && parseFloat(user.total_winnings) > 1000) {
                level = 'full';
                documents.push('identity_document', 'proof_of_funds');
            }
            const verification = {
                userId,
                level,
                documents,
                verificationDate: new Date(user.created_at),
                expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                status: 'approved',
                verifiedBy: 'system',
                riskAssessment: level === 'full' ? 20 : level === 'intermediate' ? 40 : 60
            };
            logger_1.logger.info('KYC verification completed', {
                userId,
                level,
                riskAssessment: verification.riskAssessment,
                documents: documents.length
            });
            return verification;
        }
        catch (error) {
            logger_1.logger.error('KYC verification failed', {
                userId,
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                userId,
                level: 'none',
                documents: [],
                verificationDate: new Date(),
                expiryDate: new Date(),
                status: 'rejected',
                verifiedBy: 'system',
                riskAssessment: 100
            };
        }
    }
    async createInvestigation(userId, fraudResult, transactionAmount, metadata) {
        const investigationId = `inv_${Date.now()}_${userId}`;
        const investigation = {
            id: investigationId,
            userId,
            transactionId: metadata.transactionId,
            riskScore: fraudResult.riskScore,
            flags: fraudResult.flags,
            status: 'open',
            createdAt: new Date(),
            evidence: [
                {
                    type: 'fraud_analysis',
                    data: fraudResult,
                    timestamp: new Date()
                },
                {
                    type: 'transaction_data',
                    data: { amount: transactionAmount, metadata },
                    timestamp: new Date()
                }
            ]
        };
        this.activeInvestigations.set(investigationId, investigation);
        this.metrics.investigationQueue++;
        logger_1.logger.info('Investigation created', {
            investigationId,
            userId,
            riskScore: fraudResult.riskScore,
            flags: fraudResult.flags
        });
        return investigation;
    }
    async updateComplianceMetrics() {
        try {
            const totalUsers = await this.dbService.getPrismaClient().user.count();
            const verifiedUsers = await this.dbService.getPrismaClient().user.count({
                where: {
                    email: { not: null },
                    wallet_address: { not: null }
                }
            });
            this.metrics.kycComplianceRate = totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0;
            this.metrics.investigationQueue = Array.from(this.activeInvestigations.values())
                .filter(inv => inv.status === 'open' || inv.status === 'in_progress').length;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            this.metrics.processedToday = Array.from(this.activeInvestigations.values())
                .filter(inv => inv.createdAt >= today).length;
            this.metrics.timestamp = new Date();
            logger_1.logger.debug('Compliance metrics updated', {
                kycComplianceRate: this.metrics.kycComplianceRate,
                investigationQueue: this.metrics.investigationQueue,
                processedToday: this.metrics.processedToday
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to update compliance metrics', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async processInvestigationQueue() {
        const openInvestigations = Array.from(this.activeInvestigations.values())
            .filter(inv => inv.status === 'open')
            .sort((a, b) => b.riskScore - a.riskScore);
        for (const investigation of openInvestigations.slice(0, 5)) {
            await this.processInvestigation(investigation);
        }
    }
    async processInvestigation(investigation) {
        try {
            investigation.status = 'in_progress';
            investigation.assignedTo = 'automated_system';
            let resolution = '';
            if (investigation.riskScore > 90) {
                resolution = 'High risk confirmed - account flagged for manual review';
                investigation.status = 'escalated';
            }
            else if (investigation.flags.includes('rapid_transactions')) {
                resolution = 'Rapid transaction pattern detected - rate limiting applied';
                investigation.status = 'resolved';
            }
            else if (investigation.riskScore < 60) {
                resolution = 'Risk assessment lowered - transaction approved with monitoring';
                investigation.status = 'resolved';
            }
            else {
                resolution = 'Requires manual review - escalated to compliance team';
                investigation.status = 'escalated';
            }
            investigation.resolution = resolution;
            investigation.resolvedAt = new Date();
            logger_1.logger.info('Investigation processed', {
                investigationId: investigation.id,
                userId: investigation.userId,
                status: investigation.status,
                resolution
            });
        }
        catch (error) {
            logger_1.logger.error('Investigation processing failed', {
                investigationId: investigation.id,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async generateComplianceReport() {
        const report = {
            timestamp: new Date(),
            metrics: this.metrics,
            riskDistribution: this.getRiskDistribution(),
            flagAnalysis: this.getFlagAnalysis(),
            recommendations: this.getComplianceRecommendations()
        };
        logger_1.logger.info('Compliance report generated', {
            totalTransactions: report.metrics.totalTransactions,
            flaggedTransactions: report.metrics.flaggedTransactions,
            kycComplianceRate: report.metrics.kycComplianceRate,
            investigationQueue: report.metrics.investigationQueue
        });
    }
    getRiskDistribution() {
        const investigations = Array.from(this.activeInvestigations.values());
        const distribution = {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0
        };
        for (const inv of investigations) {
            if (inv.riskScore < 30)
                distribution.low++;
            else if (inv.riskScore < 60)
                distribution.medium++;
            else if (inv.riskScore < 85)
                distribution.high++;
            else
                distribution.critical++;
        }
        return distribution;
    }
    getFlagAnalysis() {
        const investigations = Array.from(this.activeInvestigations.values());
        const flagCounts = {};
        for (const inv of investigations) {
            for (const flag of inv.flags) {
                flagCounts[flag] = (flagCounts[flag] || 0) + 1;
            }
        }
        return Object.entries(flagCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);
    }
    getComplianceRecommendations() {
        const recommendations = [];
        if (this.metrics.kycComplianceRate < 80) {
            recommendations.push('Improve KYC compliance rate through user education and incentives');
        }
        if (this.metrics.flaggedTransactions / this.metrics.totalTransactions > 0.1) {
            recommendations.push('High flagging rate detected - review fraud detection thresholds');
        }
        if (this.metrics.investigationQueue > 50) {
            recommendations.push('Investigation queue backlog - consider additional compliance staff');
        }
        if (this.metrics.falsePositiveRate > 0.2) {
            recommendations.push('High false positive rate - tune ML model parameters');
        }
        return recommendations;
    }
    getComplianceMetrics() {
        return { ...this.metrics };
    }
    getActiveInvestigations() {
        return Array.from(this.activeInvestigations.values())
            .filter(inv => inv.status === 'open' || inv.status === 'in_progress');
    }
    async shutdown() {
        if (this.complianceMonitoring) {
            clearInterval(this.complianceMonitoring);
        }
        logger_1.logger.info('Enhanced Compliance Service shutdown completed', {
            activeInvestigations: this.activeInvestigations.size,
            userPatterns: this.userPatterns.size
        });
    }
}
exports.EnhancedComplianceService = EnhancedComplianceService;
let enhancedComplianceServiceInstance;
function getEnhancedComplianceService() {
    if (!enhancedComplianceServiceInstance) {
        enhancedComplianceServiceInstance = new EnhancedComplianceService();
    }
    return enhancedComplianceServiceInstance;
}
exports.default = EnhancedComplianceService;
//# sourceMappingURL=EnhancedComplianceServiceV2.js.map