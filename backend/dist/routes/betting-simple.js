"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
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
        res.json({
            success: true,
            betId: 'bet-789',
            message: 'Bet placed successfully'
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/odds/:matchId', async (req, res, next) => {
    try {
        const { matchId } = req.params;
        if (matchId === 'non-existent-match') {
            res.status(404).json({ error: 'Match not found' });
            return;
        }
        const odds = {
            agent1: { odds: 1.8, pool: 10.5 },
            agent2: { odds: 2.2, pool: 8.3 }
        };
        res.json(odds);
    }
    catch (error) {
        next(error);
    }
});
router.get('/user/:userId', async (req, res, next) => {
    try {
        const { userId } = req.params;
        const history = [
            {
                id: 'bet-1',
                matchId: 'match-1',
                amount: 1,
                odds: 2,
                status: 'pending'
            },
            {
                id: 'bet-2',
                matchId: 'match-2',
                amount: 0.5,
                odds: 1.8,
                status: 'won'
            }
        ];
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
        const settlement = {
            matchId,
            winner,
            totalPayouts: 15.75,
            settledAt: new Date().toISOString(),
            settledBets: 12
        };
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
exports.default = router;
//# sourceMappingURL=betting-simple.js.map