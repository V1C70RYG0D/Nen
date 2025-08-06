"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setBettingService = setBettingService;
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const EnhancedComplianceService_1 = require("../services/EnhancedComplianceService");
const logger_1 = require("../middleware/logger");
const router = (0, express_1.Router)();
// Initialize compliance service
const complianceService = (0, EnhancedComplianceService_1.getEnhancedComplianceService)();
// Service instance - real implementation only
let bettingServiceInstance = null;
function getBettingService() {
    if (bettingServiceInstance) {
        return bettingServiceInstance;
    }
    // Load the real service
    try {
        const { EnhancedBettingService } = require('../services/EnhancedBettingService');
        bettingServiceInstance = new EnhancedBettingService();
        return bettingServiceInstance;
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize BettingService', {
            error: error instanceof Error ? error.message : String(error)
        });
        throw (0, errorHandler_1.createError)('Betting service unavailable', 503);
    }
}
// Export function to set service instance (for dependency injection)
function setBettingService(service) {
    bettingServiceInstance = service;
}
// POST /api/betting/place - Place a bet
router.post('/place', async (req, res, next) => {
    try {
        const { matchId, gameId, agentId, amount, odds } = req.body;
        // Support both matchId and gameId for compatibility
        const id = matchId || gameId;
        if (!id || !agentId || !amount) {
            throw (0, errorHandler_1.createError)('Missing required fields: matchId/gameId, agentId, amount', 400);
        }
        if (amount < 0.1 || amount > 100) {
            throw (0, errorHandler_1.createError)('Bet amount must be between 0.1 and 100 SOL', 400);
        }
        // Use fallback parameters for POC demonstration
        const bettorWallet = req.headers.authorization?.replace('Bearer ', '') || 'demo_wallet_address';
        const [fraudResult, kycResult] = await Promise.all([
            complianceService.detectFraud(bettorWallet, amount, 'bet_placement'),
            complianceService.checkKYCCompliance(bettorWallet)
        ]);
        // Check fraud detection result
        if (fraudResult.recommendedAction === 'block') {
            logger_1.logger.warn('Bet blocked due to fraud detection', {
                walletAddress: bettorWallet,
                amount,
                riskScore: fraudResult.riskScore,
                flaggedReasons: fraudResult.flaggedReasons
            });
            res.status(403).json({
                success: false,
                error: 'Transaction blocked for security reasons',
                riskScore: fraudResult.riskScore,
                requiresReview: true
            });
            return;
        }
        // Check KYC compliance for large amounts
        if (amount > 50 && !kycResult.isCompliant) {
            res.status(403).json({
                success: false,
                error: 'KYC verification required for large transactions',
                kycStatus: kycResult.status,
                requiresKYC: true
            });
            return;
        }
        // Log compliance metrics
        if (fraudResult.recommendedAction === 'review') {
            logger_1.logger.info('Bet requires review due to moderate risk', {
                walletAddress: bettorWallet,
                amount,
                riskScore: fraudResult.riskScore
            });
        }
        // Call the betting service (which may be mocked in tests)
        const bettingService = getBettingService();
        const predictedWinner = agentId;
        const predictedWinnerType = 'ai_agent';
        const result = await bettingService.placeBet(bettorWallet, id, amount, predictedWinner, predictedWinnerType);
        // Handle the service response
        if (result.success === false) {
            res.status(400).json(result);
            return;
        }
        res.json({
            success: result.success || true,
            betId: result.betId,
            message: result.message,
            riskScore: fraudResult.riskScore,
            complianceStatus: kycResult.status
        });
    }
    catch (error) {
        next(error);
    }
});
// GET /api/betting/odds/:matchId - Get current odds for a match (required by tests)
router.get('/odds/:matchId', async (req, res, next) => {
    try {
        const { matchId } = req.params;
        // Call the betting service
        const bettingService = getBettingService();
        const odds = await bettingService.calculateOdds(matchId);
        if (!odds) {
            res.status(404).json({ error: 'Match not found' });
            return;
        }
        res.json(odds);
    }
    catch (error) {
        next(error);
    }
});
// GET /api/betting/user/:userId - Get user betting history (required by tests)
router.get('/user/:userId', async (req, res, next) => {
    try {
        const { userId } = req.params;
        // Call the betting service
        const bettingService = getBettingService();
        const history = await bettingService.getUserBets(userId);
        res.json(history);
    }
    catch (error) {
        next(error);
    }
});
// POST /api/betting/settle/:matchId - Settle match bets (required by tests)
router.post('/settle/:matchId', async (req, res, next) => {
    try {
        const { matchId } = req.params;
        const { winnerId, finalScore } = req.body;
        if (!winnerId) {
            throw (0, errorHandler_1.createError)('Missing required field: winnerId', 400);
        }
        // Call the betting service
        const bettingService = getBettingService();
        const result = await bettingService.settleMatch(matchId, winnerId, finalScore);
        // Return the service result directly - it should include success, settledBets, totalPayout
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
// Keep backward compatibility routes
router.get('/pools/:gameId', async (req, res, next) => {
    try {
        const { gameId } = req.params;
        const pools = {
            gameId,
            totalPool: 5.75,
            pools: [
                {
                    agentId: 'royal_guard_alpha',
                    agentName: 'Royal Guard Alpha',
                    totalBets: 3.25,
                    odds: 1.77,
                    bettors: 8
                },
                {
                    agentId: 'phantom_striker',
                    agentName: 'Phantom Striker',
                    totalBets: 2.50,
                    odds: 2.30,
                    bettors: 5
                }
            ]
        };
        res.json({
            success: true,
            pools
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/history/:userId', async (req, res, next) => {
    try {
        const { userId } = req.params;
        const history = [
            {
                betId: 'bet_demo_1',
                gameId: 'game_demo_1',
                agentId: 'royal_guard_alpha',
                amount: 1.5,
                odds: 1.85,
                status: 'won',
                payout: 2.775,
                placedAt: new Date(Date.now() - 86400000).toISOString()
            }
        ];
        res.json({
            success: true,
            history
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/claim/:betId', async (req, res, next) => {
    try {
        const { betId } = req.params;
        const payout = {
            betId,
            amount: 2.775,
            status: 'claimed',
            txHash: '0x1234567890abcdef...',
            claimedAt: new Date().toISOString()
        };
        res.json({
            success: true,
            payout
        });
    }
    catch (error) {
        next(error);
    }
});
// GET /api/betting/compliance/metrics - Get compliance and fraud detection metrics
router.get('/compliance/metrics', async (req, res, next) => {
    try {
        const metrics = await complianceService.getComplianceMetrics();
        res.json({
            success: true,
            metrics: {
                ...metrics,
                timestamp: new Date().toISOString(),
                status: 'operational'
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to retrieve compliance metrics', {
            error: error instanceof Error ? error.message : String(error)
        });
        next(error);
    }
});
// GET /api/betting/patterns/:walletAddress - Get transaction patterns for a wallet
router.get('/patterns/:walletAddress', async (req, res, next) => {
    try {
        const { walletAddress } = req.params;
        const patterns = await complianceService.analyzeTransactionPatterns(walletAddress);
        res.json({
            success: true,
            patterns,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to analyze transaction patterns', {
            walletAddress: req.params.walletAddress,
            error: error instanceof Error ? error.message : String(error)
        });
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=betting.js.map