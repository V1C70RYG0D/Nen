"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockchainRoutes = exports.legacyUserRoutes = void 0;
const express_1 = require("express");
const config_1 = __importDefault(require("../config"));
const user_1 = __importDefault(require("../routes/user"));
const blockchain_1 = __importDefault(require("../routes/blockchain"));
const router = (0, express_1.Router)();
// GET /api/users/profile - Get user profile
router.get('/profile', async (req, res, next) => {
    try {
        // For production: integrate with database service
        // For now: return dynamic data based on user session or wallet
        const userPublicKey = req.headers['x-wallet-address'] || 'demo_user';
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
// PUT /api/users/profile - Update user profile
router.put('/profile', async (req, res, next) => {
    try {
        const { username, preferences } = req.body;
        const userPublicKey = req.headers['x-wallet-address'] || 'demo_user';
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
// GET /api/users/balance - Get user SOL balance
router.get('/balance', async (req, res, next) => {
    try {
        const userPublicKey = req.headers['x-wallet-address'];
        if (!userPublicKey) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address required'
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
// GET /api/users/stats - Get detailed user statistics
router.get('/stats', async (req, res, next) => {
    try {
        const userPublicKey = req.headers['x-wallet-address'] || 'demo_user';
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
// GET /api/users/leaderboard - Get leaderboard data
router.get('/leaderboard', async (req, res, next) => {
    try {
        const { period = 'all-time' } = req.query;
        // Mock data for POC - replace with actual database queries
        const leaderboard = [
            {
                rank: 1,
                agentId: 'alpha_gungi_pro',
                name: 'AlphaGungi Pro',
                rating: 2450,
                wins: 127,
                losses: 23,
                winRate: 84.7,
                totalMatches: 150,
                recentForm: ['W', 'W', 'W', 'L', 'W'],
                earnings: '245.7 SOL'
            },
            {
                rank: 2,
                agentId: 'strategic_master',
                name: 'Strategic Master',
                rating: 2398,
                wins: 108,
                losses: 32,
                winRate: 77.1,
                totalMatches: 140,
                recentForm: ['W', 'L', 'W', 'W', 'W'],
                earnings: '198.3 SOL'
            },
            {
                rank: 3,
                agentId: 'royal_guard_alpha',
                name: 'Royal Guard Alpha',
                rating: 2356,
                wins: 95,
                losses: 28,
                winRate: 77.2,
                totalMatches: 123,
                recentForm: ['L', 'W', 'W', 'W', 'L'],
                earnings: '167.8 SOL'
            },
            {
                rank: 4,
                agentId: 'tactical_genius',
                name: 'Tactical Genius',
                rating: 2301,
                wins: 87,
                losses: 35,
                winRate: 71.3,
                totalMatches: 122,
                recentForm: ['W', 'W', 'L', 'W', 'W'],
                earnings: '145.2 SOL'
            },
            {
                rank: 5,
                agentId: 'endgame_specialist',
                name: 'Endgame Specialist',
                rating: 2287,
                wins: 82,
                losses: 31,
                winRate: 72.6,
                totalMatches: 113,
                recentForm: ['L', 'L', 'W', 'W', 'W'],
                earnings: '132.5 SOL'
            }
        ];
        res.json({
            success: true,
            leaderboard,
            period,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
// Also export mounted legacy-compatible routers for SSR proxy setups if needed
exports.legacyUserRoutes = user_1.default;
exports.blockchainRoutes = blockchain_1.default;
//# sourceMappingURL=users.js.map