"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const config_1 = __importDefault(require("../config"));
const auth_1 = require("../middleware/auth");
const UserService_1 = require("../services/UserService");
const BettingService_1 = require("../services/BettingService");
const router = (0, express_1.Router)();
const userService = new UserService_1.UserService();
const bettingService = new BettingService_1.BettingService();
// POST /api/user/check-pda - Check if wallet has existing platform account PDA
router.post('/check-pda', async (req, res, next) => {
    try {
        const { walletAddress } = req.body;
        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }
        const pdaResult = await userService.checkExistingPDA(walletAddress);
        res.json({
            success: true,
            data: pdaResult
        });
    }
    catch (error) {
        console.error('Error checking PDA:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to check PDA'
        });
    }
});
// GET /api/user/derive-pda/:walletAddress - Get PDA address for wallet
router.get('/derive-pda/:walletAddress', async (req, res, next) => {
    try {
        const { walletAddress } = req.params;
        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }
        const pdaAddress = await userService.derivePdaAddress(walletAddress);
        res.json({
            success: true,
            data: {
                walletAddress,
                pdaAddress
            }
        });
    }
    catch (error) {
        console.error('Error deriving PDA:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to derive PDA address'
        });
    }
});
// POST /api/user/initialize-account - Initialize user account on-chain if needed
router.post('/initialize-account', async (req, res, next) => {
    try {
        const { walletAddress, kycLevel, region, username, autoInitialize } = req.body;
        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }
        const result = await userService.checkAndInitializeAccount(walletAddress, {
            autoInitialize: autoInitialize !== false, // Default to true
            kycLevel: kycLevel || 0,
            region: region || 0,
            username
        });
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error initializing account:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to initialize account'
        });
    }
});
// POST /api/user/check-and-initialize - Check PDA and auto-initialize if first-time user
router.post('/check-and-initialize', async (req, res, next) => {
    try {
        const { walletAddress, options } = req.body;
        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }
        // Check if account exists and initialize if needed
        const result = await userService.checkAndInitializeAccount(walletAddress, {
            autoInitialize: true,
            ...options
        });
        res.json({
            success: true,
            data: {
                walletAddress,
                ...result,
                message: result.initialized ?
                    'New user account initialized successfully' :
                    result.accountExists ?
                        'User account already exists' :
                        'Account exists but not initialized'
            }
        });
    }
    catch (error) {
        console.error('Error checking and initializing account:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to check and initialize account'
        });
    }
});
// GET /api/user/profile - Get user profile
router.get('/profile', auth_1.authMiddleware, async (req, res, next) => {
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
router.put('/profile', auth_1.authMiddleware, async (req, res, next) => {
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
router.get('/balance', auth_1.authMiddleware, async (req, res, next) => {
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
router.get('/stats', auth_1.authMiddleware, async (req, res, next) => {
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
// POST /api/user/deposit - Deposit SOL into betting account
router.post('/deposit', async (req, res, next) => {
    try {
        const { walletAddress, amount, transactionSignature } = req.body;
        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }
        if (!amount || typeof amount !== 'number') {
            return res.status(400).json({
                success: false,
                error: 'Valid amount is required'
            });
        }
        if (amount < 0.1) {
            return res.status(400).json({
                success: false,
                error: 'Minimum deposit amount is 0.1 SOL'
            });
        }
        if (amount > 1000) {
            return res.status(400).json({
                success: false,
                error: 'Maximum deposit amount is 1000 SOL'
            });
        }
        // Get or create user
        let user = await userService.getUserByWallet(walletAddress);
        if (!user) {
            user = await userService.createUser(walletAddress);
        }
        // Process deposit
        const depositResult = await bettingService.depositSol({
            userId: user.id,
            walletAddress,
            amount,
            transactionSignature
        });
        res.json({
            success: true,
            data: depositResult,
            message: 'Deposit processed successfully'
        });
    }
    catch (error) {
        console.error('Error processing deposit:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process deposit'
        });
    }
});
// POST /api/user/withdraw - Withdraw SOL from betting account
router.post('/withdraw', async (req, res, next) => {
    try {
        const { walletAddress, amount, destinationAddress } = req.body;
        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }
        if (!amount || typeof amount !== 'number') {
            return res.status(400).json({
                success: false,
                error: 'Valid amount is required'
            });
        }
        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Withdrawal amount must be greater than 0'
            });
        }
        // Get user
        const user = await userService.getUserByWallet(walletAddress);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        // Process withdrawal
        const withdrawalResult = await bettingService.withdrawSol({
            userId: user.id,
            walletAddress,
            amount,
            destinationAddress
        });
        res.json({
            success: true,
            data: withdrawalResult,
            message: 'Withdrawal processed successfully'
        });
    }
    catch (error) {
        console.error('Error processing withdrawal:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process withdrawal'
        });
    }
});
// GET /api/user/betting-account/:walletAddress - Get betting account details
router.get('/betting-account/:walletAddress', async (req, res, next) => {
    try {
        const { walletAddress } = req.params;
        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }
        const bettingAccount = await bettingService.getBettingAccount(walletAddress);
        res.json({
            success: true,
            data: bettingAccount
        });
    }
    catch (error) {
        console.error('Error getting betting account:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get betting account'
        });
    }
});
// GET /api/user/transaction-history/:walletAddress - Get transaction history
router.get('/transaction-history/:walletAddress', async (req, res, next) => {
    try {
        const { walletAddress } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }
        const history = await bettingService.getTransactionHistory(walletAddress, limit);
        res.json({
            success: true,
            data: {
                transactions: history,
                total: history.length
            }
        });
    }
    catch (error) {
        console.error('Error getting transaction history:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get transaction history'
        });
    }
});
exports.default = router;
//# sourceMappingURL=user.js.map