"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedKYCMiddleware = exports.amlMiddleware = exports.kycMiddleware = void 0;
const logger_1 = require("../utils/logger");
const redis_1 = require("../utils/redis");
class KYCService {
    cache;
    constructor() {
        this.cache = new redis_1.CacheService();
    }
    async verifyKYC(walletAddress) {
        const cacheKey = `kyc:${walletAddress}`;
        const cached = await this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const simulatedUser = {
            id: `kyc_${Date.now()}`,
            walletAddress,
            kycStatus: this.simulateKYCStatus(walletAddress),
            kycLevel: 'basic',
            riskScore: this.calculateRiskScore(walletAddress),
            lastKycUpdate: new Date(),
        };
        await this.cache.set(cacheKey, simulatedUser, 3600);
        return simulatedUser;
    }
    async performAMLCheck(walletAddress, amount) {
        const cacheKey = `aml:${walletAddress}`;
        const cached = await this.cache.get(cacheKey);
        if (cached && this.isRecentCheck(cached.lastChecked)) {
            return cached;
        }
        const flags = [];
        let riskScore = 0;
        if (amount > 100) {
            riskScore += 20;
            flags.push('high_value_transaction');
        }
        const walletAge = this.estimateWalletAge(walletAddress);
        if (walletAge < 30) {
            riskScore += 15;
            flags.push('new_wallet');
        }
        if (this.isSanctionedAddress(walletAddress)) {
            riskScore = 100;
            flags.push('sanctioned_address');
        }
        const amlResult = {
            isClean: riskScore < 50,
            riskScore,
            flags,
            lastChecked: new Date(),
        };
        await this.cache.set(cacheKey, amlResult, 900);
        return amlResult;
    }
    simulateKYCStatus(walletAddress) {
        const hash = this.simpleHash(walletAddress);
        if (hash % 10 === 0)
            return 'rejected';
        if (hash % 20 === 1)
            return 'pending';
        return 'verified';
    }
    calculateRiskScore(walletAddress) {
        const hash = this.simpleHash(walletAddress);
        return hash % 100;
    }
    estimateWalletAge(walletAddress) {
        const hash = this.simpleHash(walletAddress);
        return (hash % 365) + 1;
    }
    isSanctionedAddress(walletAddress) {
        const sanctionedPatterns = ['SANCT', 'BLOCK', 'BANNED'];
        return sanctionedPatterns.some(pattern => walletAddress.toUpperCase().includes(pattern));
    }
    isRecentCheck(lastChecked) {
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        return lastChecked > fifteenMinutesAgo;
    }
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
}
const kycService = new KYCService();
const kycMiddleware = async (req, res, next) => {
    try {
        const walletAddress = req.user?.walletAddress || req.body?.walletAddress;
        if (!walletAddress) {
            res.status(400).json({
                error: 'Wallet address required for KYC verification',
                code: 'WALLET_ADDRESS_REQUIRED'
            });
            return;
        }
        const kycResult = await kycService.verifyKYC(walletAddress);
        if (kycResult.kycStatus !== 'verified') {
            logger_1.logger.warn(`KYC verification failed for wallet: ${walletAddress}`, {
                status: kycResult.kycStatus,
                riskScore: kycResult.riskScore
            });
            res.status(403).json({
                error: 'KYC verification required',
                code: 'KYC_VERIFICATION_FAILED',
                status: kycResult.kycStatus,
                details: 'Please complete identity verification to access this feature'
            });
            return;
        }
        req.kyc = kycResult;
        next();
    }
    catch (error) {
        logger_1.logger.error('KYC middleware error:', error);
        res.status(500).json({
            error: 'KYC verification service unavailable',
            code: 'KYC_SERVICE_ERROR'
        });
    }
};
exports.kycMiddleware = kycMiddleware;
const amlMiddleware = async (req, res, next) => {
    try {
        const walletAddress = req.user?.walletAddress || req.body?.walletAddress;
        const amount = parseFloat(req.body?.amount || req.body?.amountSol || '0');
        if (!walletAddress) {
            res.status(400).json({
                error: 'Wallet address required for AML screening',
                code: 'WALLET_ADDRESS_REQUIRED'
            });
            return;
        }
        const amlResult = await kycService.performAMLCheck(walletAddress, amount);
        if (!amlResult.isClean) {
            logger_1.logger.warn(`AML screening failed for wallet: ${walletAddress}`, {
                riskScore: amlResult.riskScore,
                flags: amlResult.flags,
                amount
            });
            res.status(403).json({
                error: 'Transaction blocked by AML screening',
                code: 'AML_SCREENING_FAILED',
                riskScore: amlResult.riskScore,
                flags: amlResult.flags,
                details: 'This transaction has been flagged for manual review'
            });
            return;
        }
        req.aml = amlResult;
        next();
    }
    catch (error) {
        logger_1.logger.error('AML middleware error:', error);
        res.status(500).json({
            error: 'AML screening service unavailable',
            code: 'AML_SERVICE_ERROR'
        });
    }
};
exports.amlMiddleware = amlMiddleware;
const enhancedKYCMiddleware = async (req, res, next) => {
    try {
        const walletAddress = req.user?.walletAddress || req.body?.walletAddress;
        if (!walletAddress) {
            res.status(400).json({
                error: 'Wallet address required for enhanced KYC verification',
                code: 'WALLET_ADDRESS_REQUIRED'
            });
            return;
        }
        const kycResult = await kycService.verifyKYC(walletAddress);
        if (kycResult.kycStatus !== 'verified' || kycResult.riskScore > 25) {
            logger_1.logger.warn(`Enhanced KYC verification failed for wallet: ${walletAddress}`, {
                status: kycResult.kycStatus,
                riskScore: kycResult.riskScore
            });
            res.status(403).json({
                error: 'Enhanced KYC verification required',
                code: 'ENHANCED_KYC_REQUIRED',
                status: kycResult.kycStatus,
                riskScore: kycResult.riskScore,
                details: 'This operation requires enhanced identity verification'
            });
            return;
        }
        req.kyc = kycResult;
        next();
    }
    catch (error) {
        logger_1.logger.error('Enhanced KYC middleware error:', error);
        res.status(500).json({
            error: 'Enhanced KYC verification service unavailable',
            code: 'ENHANCED_KYC_SERVICE_ERROR'
        });
    }
};
exports.enhancedKYCMiddleware = enhancedKYCMiddleware;
//# sourceMappingURL=kyc.js.map