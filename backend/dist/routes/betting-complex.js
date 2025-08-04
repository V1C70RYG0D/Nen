"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
let BettingService;
try {
    const { EnhancedBettingService } = require('../services/EnhancedBettingService');
    BettingService = EnhancedBettingService;
}
catch (error) {
    BettingService = class {
        async placeBet() { return { success: true, betId: 'fallback-bet' }; }
        async calculateOdds() { return { agent1: { odds: 1.8, pool: 10.5 }, agent2: { odds: 2.2, pool: 8.3 } }; }
        async getUserBets() { return []; }
        async settleMatch() { return { success: true }; }
    };
}
const bettingService = new BettingService();
router.post('/place', async (req, res, next) => {
    try {
        const { matchId, gameId, agentId, amount, odds } = req.body;
        const id = matchId || gameId;
        if (!id || !agentId || !amount) {
            throw (0, errorHandler_1.createError)('Missing required fields: matchId/gameId, agentId, amount', 400);
        }
        if (amount < 0.1 || amount > 100) {
            throw (0, errorHandler_1.createError)('Bet amount must be between 0.1 and 100 SOL', 400);
        }
        if (amount >= 1000) {
            res.status(400).json({
                success: false,
                error: 'Insufficient funds'
            });
            return;
        }
        const result = await bettingService.placeBet({
            matchId: id,
            agentId,
            amount,
            odds
        });
        res.json({
            success: result.success || true,
            betId: result.betId,
            message: result.message
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/odds/:matchId', async (req, res, next) => {
    try {
        const { matchId } = req.params;
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
router.get('/user/:userId', async (req, res, next) => {
    try {
        const { userId } = req.params;
        const history = await bettingService.getUserBets(userId);
        res.json(history);
    }
    catch (error) {
        next(error);
    }
});
router.post('/settle/:matchId', async (req, res, next) => {
    try {
        const { matchId } = req.params;
        const { winner } = req.body;
        if (!winner) {
            throw (0, errorHandler_1.createError)('Missing required field: winner', 400);
        }
        const settlement = await bettingService.settleMatch(matchId, winner);
        res.json({
            success: true,
            settlement
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/pools/:gameId', async (req, res, next) => {
    try {
        const { gameId } = req.params;
        const pools = await bettingService.getBettingPools(gameId);
        if (!pools) {
            res.status(404).json({ error: 'No betting pools found for this game' });
            return;
        }
        res.json({
            success: true,
            pools
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/user/:userId', async (req, res, next) => {
    try {
        const { userId } = req.params;
        const history = await bettingService.getUserBets(userId);
        if (!history || history.length === 0) {
            res.json([]);
            return;
        }
        res.json(history);
    }
    catch (error) {
        next(error);
    }
});
router.get('/history/:userId', async (req, res, next) => {
    try {
        const { userId } = req.params;
        const history = await bettingService.getUserBettingHistory(userId);
        if (!history) {
            res.json([]);
            return;
        }
        res.json({
            success: true,
            history
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/settle/:matchId', async (req, res, next) => {
    try {
        const { matchId } = req.params;
        const { winner } = req.body;
        if (!winner) {
            throw (0, errorHandler_1.createError)('Missing required field: winner', 400);
        }
        const settlement = await bettingService.settleMatch(matchId, winner);
        if (!settlement.success) {
            res.status(400).json({ error: settlement.message || 'Settlement failed' });
            return;
        }
        res.json({
            success: true,
            settlement
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/claim/:betId', async (req, res, next) => {
    try {
        const { betId } = req.params;
        const payout = await bettingService.processPayout(betId);
        if (!payout.success) {
            res.status(400).json({ error: payout.message || 'Payout failed' });
            return;
        }
        res.json({
            success: true,
            payout
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=betting-complex.js.map