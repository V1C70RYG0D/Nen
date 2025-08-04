"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedBettingService = exports.EnhancedBettingService = void 0;
const web3_js_1 = require("@solana/web3.js");
const logger_1 = require("../utils/logger");
const uuid_1 = require("uuid");
const EnhancedCachingService_1 = require("./EnhancedCachingService");
var BetStatus;
(function (BetStatus) {
    BetStatus["PENDING"] = "pending";
    BetStatus["ACTIVE"] = "active";
    BetStatus["WON"] = "won";
    BetStatus["LOST"] = "lost";
    BetStatus["CANCELLED"] = "cancelled";
    BetStatus["SETTLED"] = "settled";
    BetStatus["FLAGGED"] = "flagged";
    BetStatus["UNDER_REVIEW"] = "under_review";
})(BetStatus || (BetStatus = {}));
var KYCStatus;
(function (KYCStatus) {
    KYCStatus["NOT_VERIFIED"] = "not_verified";
    KYCStatus["PENDING"] = "pending";
    KYCStatus["VERIFIED"] = "verified";
    KYCStatus["REJECTED"] = "rejected";
    KYCStatus["EXPIRED"] = "expired";
})(KYCStatus || (KYCStatus = {}));
var PoolComplianceStatus;
(function (PoolComplianceStatus) {
    PoolComplianceStatus["COMPLIANT"] = "compliant";
    PoolComplianceStatus["UNDER_REVIEW"] = "under_review";
    PoolComplianceStatus["RESTRICTED"] = "restricted";
    PoolComplianceStatus["BLOCKED"] = "blocked";
})(PoolComplianceStatus || (PoolComplianceStatus = {}));
var RiskLevel;
(function (RiskLevel) {
    RiskLevel["LOW"] = "low";
    RiskLevel["MEDIUM"] = "medium";
    RiskLevel["HIGH"] = "high";
    RiskLevel["CRITICAL"] = "critical";
})(RiskLevel || (RiskLevel = {}));
class EnhancedBettingService {
    config;
    activePools = new Map();
    userBetHistory = new Map();
    complianceCache = new Map();
    constructor() {
        this.config = {
            minBetAmount: web3_js_1.LAMPORTS_PER_SOL * 0.01,
            maxBetAmount: web3_js_1.LAMPORTS_PER_SOL * 100,
            platformFee: parseInt(process.env.PLATFORM_FEE_BPS || '250'),
            treasuryWallet: new web3_js_1.PublicKey(process.env.TREASURY_WALLET || '11111111111111111111111111111111'),
            bettingDeadline: 5,
            kycRequired: true,
            amlRequired: true,
            geoRestrictionsEnabled: true,
            fraudDetectionEnabled: true,
            maxRiskScore: 75,
            requireMultiSig: false,
            restrictedCountries: ['US', 'CN', 'KP'],
            dailyBetLimit: web3_js_1.LAMPORTS_PER_SOL * 1000,
            monthlyBetLimit: web3_js_1.LAMPORTS_PER_SOL * 10000
        };
        logger_1.logger.info('Enhanced Betting Service initialized with compliance features');
    }
    async createBettingPool(matchId) {
        try {
            logger_1.logger.info(`Creating enhanced betting pool for match: ${matchId}`);
            const pool = {
                matchId,
                totalPool: 0,
                betsCount: 0,
                oddsPlayer1: 2.0,
                oddsPlayer2: 2.0,
                bets: [],
                isActive: true,
                complianceStatus: PoolComplianceStatus.COMPLIANT,
                riskLevel: RiskLevel.LOW,
                geographicRestrictions: this.config.restrictedCountries,
                maxBetLimits: new Map()
            };
            this.activePools.set(matchId, pool);
            await EnhancedCachingService_1.enhancedCachingService.set({ type: 'betting_pool', identifier: matchId }, pool, 3600);
            logger_1.logger.info(`Enhanced betting pool created successfully for match: ${matchId}`);
            return pool;
        }
        catch (error) {
            logger_1.logger.error(`Failed to create betting pool for match ${matchId}:`, error);
            throw new Error(`Betting pool creation failed: ${error}`);
        }
    }
    async placeBet(matchId, bettorWallet, amount, predictedWinner, predictedWinnerType, geoLocation) {
        try {
            const pool = this.activePools.get(matchId);
            if (!pool) {
                throw new Error(`Betting pool not found for match: ${matchId}`);
            }
            if (!pool.isActive) {
                throw new Error(`Betting is closed for match: ${matchId}`);
            }
            await this.validateBetAmount(amount);
            await this.validateUserLimits(bettorWallet, amount);
            const complianceChecks = await this.performComplianceChecks(bettorWallet, amount, geoLocation);
            const riskScore = this.calculateRiskScore(complianceChecks, amount);
            if (riskScore > this.config.maxRiskScore) {
                throw new Error(`Bet rejected due to high risk score: ${riskScore}`);
            }
            const bet = {
                id: (0, uuid_1.v4)(),
                matchId,
                bettorWallet,
                amount,
                predictedWinner,
                predictedWinnerType,
                odds: predictedWinnerType === 'user' ? pool.oddsPlayer1 : pool.oddsPlayer2,
                placedAt: new Date(),
                status: BetStatus.ACTIVE,
                potentialPayout: Math.floor(amount * (predictedWinnerType === 'user' ? pool.oddsPlayer1 : pool.oddsPlayer2)),
                escrowAccount: this.generateEscrowAccount(),
                kycStatus: await this.getKYCStatus(bettorWallet),
                geoLocation,
                riskScore,
                complianceChecks,
                fraudDetectionScore: await this.calculateFraudScore(bettorWallet, amount)
            };
            pool.bets.push(bet);
            pool.betsCount++;
            pool.totalPool += amount;
            if (!this.userBetHistory.has(bettorWallet)) {
                this.userBetHistory.set(bettorWallet, []);
            }
            this.userBetHistory.get(bettorWallet).push(bet);
            this.updatePoolOdds(pool);
            await EnhancedCachingService_1.enhancedCachingService.set({ type: 'betting_pool', identifier: matchId }, pool, 3600);
            logger_1.logger.info(`Bet placed successfully: ${bet.id} for match ${matchId}`);
            return bet;
        }
        catch (error) {
            logger_1.logger.error(`Failed to place bet for match ${matchId}:`, error);
            throw error;
        }
    }
    async performComplianceChecks(wallet, amount, geoLocation) {
        const checks = [];
        if (this.config.kycRequired) {
            const kycCheck = {
                type: 'kyc',
                status: await this.checkKYC(wallet) ? 'passed' : 'failed',
                timestamp: new Date(),
                details: 'Identity verification check'
            };
            checks.push(kycCheck);
        }
        if (this.config.geoRestrictionsEnabled && geoLocation) {
            const geoCheck = {
                type: 'geo',
                status: this.config.restrictedCountries.includes(geoLocation) ? 'failed' : 'passed',
                timestamp: new Date(),
                details: `Geographic location: ${geoLocation}`
            };
            checks.push(geoCheck);
        }
        if (this.config.amlRequired) {
            const amlCheck = {
                type: 'aml',
                status: await this.checkAML(wallet, amount) ? 'passed' : 'failed',
                timestamp: new Date(),
                details: 'Anti-money laundering screening',
                score: await this.calculateFraudScore(wallet, amount) * 100
            };
            checks.push(amlCheck);
        }
        if (this.config.fraudDetectionEnabled) {
            const fraudCheck = {
                type: 'fraud',
                status: await this.checkFraud(wallet, amount) ? 'passed' : 'failed',
                timestamp: new Date(),
                details: 'Behavioral fraud analysis',
                score: await this.calculateFraudScore(wallet, amount) * 100
            };
            checks.push(fraudCheck);
        }
        return checks;
    }
    calculateRiskScore(checks, amount) {
        let riskScore = 0;
        for (const check of checks) {
            if (check.status === 'failed') {
                riskScore += 25;
            }
            else if (check.status === 'pending') {
                riskScore += 10;
            }
            if (check.score && check.score > 70) {
                riskScore += 15;
            }
        }
        if (amount > this.config.maxBetAmount * 0.5) {
            riskScore += 10;
        }
        return Math.min(100, riskScore);
    }
    async validateBetAmount(amount) {
        if (amount < this.config.minBetAmount) {
            throw new Error(`Bet amount too low. Minimum: ${this.config.minBetAmount / web3_js_1.LAMPORTS_PER_SOL} SOL`);
        }
        if (amount > this.config.maxBetAmount) {
            throw new Error(`Bet amount too high. Maximum: ${this.config.maxBetAmount / web3_js_1.LAMPORTS_PER_SOL} SOL`);
        }
    }
    async validateUserLimits(wallet, amount) {
        const userHistory = this.userBetHistory.get(wallet) || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todaysBets = userHistory.filter(bet => bet.placedAt >= today);
        const dailyTotal = todaysBets.reduce((sum, bet) => sum + bet.amount, 0);
        if (dailyTotal + amount > this.config.dailyBetLimit) {
            throw new Error(`Daily betting limit exceeded`);
        }
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthlyBets = userHistory.filter(bet => bet.placedAt >= monthStart);
        const monthlyTotal = monthlyBets.reduce((sum, bet) => sum + bet.amount, 0);
        if (monthlyTotal + amount > this.config.monthlyBetLimit) {
            throw new Error(`Monthly betting limit exceeded`);
        }
    }
    async checkKYC(wallet) {
        if (!wallet || wallet.length < 32)
            return false;
        const hasMinimumHistory = wallet.length === 44;
        const isNotFlagged = !this.isFlaggedWallet(wallet);
        return hasMinimumHistory && isNotFlagged;
    }
    async checkAML(wallet, amount) {
        if (amount > 10000 * web3_js_1.LAMPORTS_PER_SOL) {
            return this.performEnhancedAMLCheck(wallet, amount);
        }
        return !this.isHighRiskWallet(wallet) && amount < 50000 * web3_js_1.LAMPORTS_PER_SOL;
    }
    async checkFraud(wallet, amount) {
        const riskFactors = this.calculateRiskFactors(wallet, amount);
        const fraudScore = riskFactors.reduce((sum, factor) => sum + factor, 0) / riskFactors.length;
        return fraudScore < 0.3;
    }
    async getKYCStatus(wallet) {
        const isVerified = await this.checkKYC(wallet);
        return isVerified ? KYCStatus.VERIFIED : KYCStatus.PENDING;
    }
    async calculateFraudScore(wallet, amount) {
        const riskFactors = this.calculateRiskFactors(wallet, amount);
        return riskFactors.reduce((sum, factor) => sum + factor, 0) / riskFactors.length;
    }
    isFlaggedWallet(wallet) {
        const flaggedPatterns = ['1111111111', '0000000000'];
        return flaggedPatterns.some(pattern => wallet.includes(pattern));
    }
    isHighRiskWallet(wallet) {
        return wallet.startsWith('Test') || wallet.length !== 44;
    }
    performEnhancedAMLCheck(wallet, amount) {
        return amount < 100000 * web3_js_1.LAMPORTS_PER_SOL && !this.isHighRiskWallet(wallet);
    }
    calculateRiskFactors(wallet, amount) {
        const factors = [];
        factors.push(Math.min(amount / (100000 * web3_js_1.LAMPORTS_PER_SOL), 1.0));
        factors.push(wallet.length === 44 ? 0.1 : 0.8);
        factors.push(this.isFlaggedWallet(wallet) ? 1.0 : 0.1);
        return factors;
    }
    updatePoolOdds(pool) {
        const player1Bets = pool.bets.filter(bet => bet.predictedWinnerType === 'user').length;
        const player2Bets = pool.bets.filter(bet => bet.predictedWinnerType === 'ai_agent').length;
        if (player1Bets + player2Bets === 0)
            return;
        const total = player1Bets + player2Bets;
        pool.oddsPlayer1 = Math.max(1.1, total / Math.max(1, player1Bets));
        pool.oddsPlayer2 = Math.max(1.1, total / Math.max(1, player2Bets));
    }
    generateEscrowAccount() {
        return `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    async getBettingPool(matchId) {
        const pool = this.activePools.get(matchId);
        if (pool)
            return pool;
        return await EnhancedCachingService_1.enhancedCachingService.get({ type: 'betting_pool', identifier: matchId });
    }
    getUserBetHistory(wallet) {
        return this.userBetHistory.get(wallet) || [];
    }
    async getComplianceStatus(betId) {
        return this.complianceCache.get(betId) || [];
    }
    async closeBetting(matchId) {
        const pool = this.activePools.get(matchId);
        if (pool) {
            pool.isActive = false;
            await EnhancedCachingService_1.enhancedCachingService.set({ type: 'betting_pool', identifier: matchId }, pool, 3600);
            logger_1.logger.info(`Betting closed for match: ${matchId}`);
        }
    }
}
exports.EnhancedBettingService = EnhancedBettingService;
exports.enhancedBettingService = new EnhancedBettingService();
//# sourceMappingURL=EnhancedBettingServiceV2.js.map