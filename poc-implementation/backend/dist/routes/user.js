"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const config_1 = __importDefault(require("../config"));
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// GET /api/user/profile - Get user profile
router.get('/profile', auth_js_1.authMiddleware, async (req, res, next) => {
    try {
        // Get user information from authenticated request
        const user = req.user;
        const userPublicKey = user?.publicKey || 'demo_user';
        const publicKeyStr = Array.isArray(userPublicKey) ? userPublicKey[0] : userPublicKey;
        const profile = {
            id: `user_${Buffer.from(publicKeyStr).toString('hex').slice(0, 8)}`,
            publicKey: userPublicKey,
            username: `Player_${userPublicKey.slice(-4)}`,
            stats: {
                gamesPlayed: Math.floor(Math.random() * 100) + 10,
                gamesWon: Math.floor(Math.random() * 50) + 5,
                winRate: parseFloat((Math.random() * 0.5 + 0.3).toFixed(2)),
                elo: Math.floor(Math.random() * 800) + 1000,
                totalBetAmount: parseFloat((Math.random() * 50).toFixed(2)),
                totalWinnings: parseFloat((Math.random() * 100).toFixed(2))
            },
            achievements: [
                'first_win',
                'betting_novice',
                'ai_trainer'
            ].slice(0, Math.floor(Math.random() * 3) + 1),
            createdAt: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString()
        };
        res.json({
            success: true,
            profile
        });
    }
    catch (error) {
        next(error);
    }
});
// PUT /api/user/profile - Update user profile
router.put('/profile', auth_js_1.authMiddleware, async (req, res, next) => {
    try {
        const { username, preferences } = req.body;
        const user = req.user;
        const userPublicKey = user?.publicKey || 'demo_user';
        const publicKeyStr = Array.isArray(userPublicKey) ? userPublicKey[0] : userPublicKey;
        // For production: save to database
        // For now: return confirmation with validated data
        const updatedProfile = {
            id: `user_${Buffer.from(publicKeyStr).toString('hex').slice(0, 8)}`,
            username: username?.trim() || `Player_${userPublicKey.slice(-4)}`,
            preferences: {
                theme: preferences?.theme || 'dark',
                notifications: preferences?.notifications !== false,
                autoMove: preferences?.autoMove === true,
                soundEnabled: preferences?.soundEnabled !== false
            },
            updatedAt: new Date().toISOString()
        };
        res.json({
            success: true,
            profile: updatedProfile
        });
    }
    catch (error) {
        next(error);
    }
});
// GET /api/user/balance - Get user SOL balance
router.get('/balance', auth_js_1.authMiddleware, async (req, res, next) => {
    try {
        const user = req.user;
        const userPublicKey = user?.publicKey;
        if (!userPublicKey) {
            return res.status(400).json({
                success: false,
                error: 'User not authenticated'
            });
        }
        // For production: query Solana RPC for actual balance
        // For now: simulate realistic balance data
        const baseBalance = Math.random() * 50 + 5;
        const balance = {
            wallet: parseFloat(baseBalance.toFixed(4)),
            betting: parseFloat((Math.random() * 10).toFixed(4)),
            total: parseFloat((baseBalance + Math.random() * 10).toFixed(4)),
            walletAddress: userPublicKey,
            network: config_1.default.solana.network,
            lastUpdated: new Date().toISOString()
        };
        res.json({
            success: true,
            balance
        });
    }
    catch (error) {
        next(error);
    }
});
// GET /api/user/stats - Get detailed user statistics
router.get('/stats', auth_js_1.authMiddleware, async (req, res, next) => {
    try {
        const user = req.user;
        const userPublicKey = user?.publicKey || 'demo_user';
        const publicKeyStr = Array.isArray(userPublicKey) ? userPublicKey[0] : userPublicKey;
        // For production: query database for user statistics
        // For now: generate dynamic stats based on user wallet
        const hashValue = Buffer.from(publicKeyStr).toString('hex').slice(0, 8);
        const seedValue = parseInt(hashValue, 16) % 1000;
        const totalGames = Math.floor(seedValue / 10) + 20;
        const wins = Math.floor(totalGames * (0.4 + (seedValue % 100) / 200));
        const losses = totalGames - wins;
        const stats = {
            gaming: {
                totalGames,
                wins,
                losses,
                winRate: parseFloat((wins / totalGames).toFixed(2)),
                averageGameDuration: `${Math.floor(seedValue / 50) + 8}m ${(seedValue % 60)}s`,
                favoriteOpening: ['Royal Guard Formation', 'Aggressive Assault', 'Defensive Wall'][seedValue % 3]
            },
            betting: {
                totalBets: Math.floor(totalGames * 0.6),
                successfulBets: Math.floor(totalGames * 0.6 * 0.65),
                successRate: 0.65,
                totalWagered: 23.5,
                totalWinnings: 31.2,
                biggestWin: 5.4,
                roi: 0.328
            },
            ai: {
                agentsOwned: 3,
                agentsTrained: 2,
                trainingHours: 156,
                customizations: 8
            }
        };
        res.json({
            success: true,
            stats
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=user.js.map