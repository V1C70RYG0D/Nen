"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const uuid_1 = require("uuid");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const web3_js_1 = require("@solana/web3.js");
const UserService_1 = require("../../services/UserService");
const setup_1 = require("../setup");
const database_1 = require("../../utils/database");
const logger_1 = require("../../utils/logger");
(0, globals_1.describe)('User Profile Management', () => {
    let testEnv;
    let testData;
    let balanceTestData;
    let bettingHistoryData;
    let statisticsData;
    let privacyData;
    (0, globals_1.beforeAll)(async () => {
        try {
            logger_1.logger.info('🚀 Setting up User Profile Management test environment...');
            const userService = new UserService_1.UserService();
            const redisClient = await (0, setup_1.getTestRedisClient)();
            const testWallet = web3_js_1.Keypair.generate();
            const testUser = await userService.createUser(testWallet.publicKey.toString(), {
                username: `test_user_${Date.now()}`,
                email: `test.${Date.now()}@nen-platform.com`,
                preferences: {
                    theme: 'dark',
                    notifications: true,
                    autoPlay: false,
                    soundEnabled: true
                }
            });
            const testUserToken = jsonwebtoken_1.default.sign({ userId: testUser.id, wallet: testUser.walletAddress }, process.env.JWT_SECRET || 'test-jwt-secret', { expiresIn: '1h' });
            testEnv = {
                userService,
                testUser,
                testWallet,
                testUserToken,
                redisClient
            };
            testData = {
                validUsername: `ValidUser_${Date.now()}`,
                validEmail: `valid.${Date.now()}@example.com`,
                validPreferences: {
                    theme: 'light',
                    notifications: {
                        email: true,
                        inApp: false,
                        betting: true,
                        gameResults: false
                    },
                    privacy: {
                        showStats: false,
                        showWallet: true,
                        allowDirectMessages: false
                    },
                    gameSettings: {
                        autoPlay: true,
                        soundEnabled: false,
                        animationsEnabled: true,
                        boardTheme: 'classic'
                    }
                },
                invalidUsername: '',
                invalidEmail: 'invalid-email-format',
                avatarImageUrl: 'https://example.com/avatar.jpg',
                profileImageData: Buffer.from('fake-image-data')
            };
            balanceTestData = {
                initialSolBalance: 10.5,
                initialBettingBalance: 5.25,
                positiveChange: 2.75,
                negativeChange: -1.5,
                largeTransaction: 100.0
            };
            bettingHistoryData = {
                testBets: [
                    {
                        id: (0, uuid_1.v4)(),
                        amount: 1.5,
                        outcome: 'win',
                        gameId: (0, uuid_1.v4)(),
                        createdAt: new Date()
                    },
                    {
                        id: (0, uuid_1.v4)(),
                        amount: 0.75,
                        outcome: 'loss',
                        gameId: (0, uuid_1.v4)(),
                        createdAt: new Date(Date.now() - 3600000)
                    },
                    {
                        id: (0, uuid_1.v4)(),
                        amount: 2.25,
                        outcome: 'pending',
                        gameId: (0, uuid_1.v4)(),
                        createdAt: new Date(Date.now() - 7200000)
                    }
                ]
            };
            statisticsData = {
                gamesPlayed: 25,
                gamesWon: 15,
                totalWagered: 125.50,
                totalWinnings: 89.25,
                winStreak: 3,
                bestWinStreak: 8
            };
            privacyData = {
                showStats: false,
                showWallet: true,
                allowDirectMessages: false,
                dataProcessingConsent: true
            };
            logger_1.logger.info('✅ User Profile Management test environment setup complete');
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to setup test environment:', error);
            throw error;
        }
    });
    (0, globals_1.afterAll)(async () => {
        try {
            logger_1.logger.info('🧹 Cleaning up User Profile Management test environment...');
            if (testEnv?.testUser?.id) {
                await (0, database_1.query)('DELETE FROM users WHERE id = $1', [testEnv.testUser.id]);
            }
            if (testEnv?.redisClient) {
                await testEnv.redisClient.quit();
            }
            logger_1.logger.info('✅ User Profile Management test cleanup complete');
        }
        catch (error) {
            logger_1.logger.error('❌ Test cleanup failed:', error);
        }
    });
    (0, globals_1.beforeEach)(async () => {
        if (testEnv?.redisClient) {
            await testEnv.redisClient.flushdb();
        }
    });
    (0, globals_1.describe)('Profile creation and updates', () => {
        (0, globals_1.test)('should create user profile with valid data', async () => {
            const walletKeypair = web3_js_1.Keypair.generate();
            const userData = {
                username: testData.validUsername,
                email: testData.validEmail,
                preferences: testData.validPreferences
            };
            const user = await testEnv.userService.createUser(walletKeypair.publicKey.toString(), userData);
            (0, globals_1.expect)(user).toBeDefined();
            (0, globals_1.expect)(user.walletAddress).toBe(walletKeypair.publicKey.toString());
            (0, globals_1.expect)(user.username).toBe(testData.validUsername);
            (0, globals_1.expect)(user.email).toBe(testData.validEmail);
            (0, globals_1.expect)(user.preferences).toEqual(testData.validPreferences);
            (0, globals_1.expect)(user.isActive).toBe(true);
            (0, globals_1.expect)(user.createdAt).toBeInstanceOf(Date);
            (0, globals_1.expect)(user.updatedAt).toBeInstanceOf(Date);
            await (0, database_1.query)('DELETE FROM users WHERE id = $1', [user.id]);
        });
        (0, globals_1.test)('should update user profile with partial data', async () => {
            const updates = {
                username: `Updated_${Date.now()}`,
                email: `updated.${Date.now()}@example.com`
            };
            const updatedUser = await testEnv.userService.updateUser(testEnv.testUser.id, updates);
            (0, globals_1.expect)(updatedUser.username).toBe(updates.username);
            (0, globals_1.expect)(updatedUser.email).toBe(updates.email);
            (0, globals_1.expect)(updatedUser.updatedAt.getTime()).toBeGreaterThan(testEnv.testUser.updatedAt.getTime());
        });
        (0, globals_1.test)('should update user preferences independently', async () => {
            const newPreferences = {
                theme: 'light',
                notifications: {
                    email: false,
                    inApp: true,
                    betting: false,
                    gameResults: true
                }
            };
            const updatedUser = await testEnv.userService.updateUser(testEnv.testUser.id, { preferences: newPreferences });
            (0, globals_1.expect)(updatedUser.preferences).toEqual(newPreferences);
        });
        (0, globals_1.test)('should reject invalid username formats', async () => {
            await (0, globals_1.expect)(testEnv.userService.updateUser(testEnv.testUser.id, {
                username: testData.invalidUsername
            })).rejects.toThrow();
        });
        (0, globals_1.test)('should reject invalid email formats', async () => {
            await (0, globals_1.expect)(testEnv.userService.updateUser(testEnv.testUser.id, {
                email: testData.invalidEmail
            })).rejects.toThrow();
        });
        (0, globals_1.test)('should prevent duplicate username registration', async () => {
            const walletKeypair = web3_js_1.Keypair.generate();
            await (0, globals_1.expect)(testEnv.userService.createUser(walletKeypair.publicKey.toString(), {
                username: testEnv.testUser.username
            })).rejects.toThrow();
        });
        (0, globals_1.test)('should handle concurrent profile updates', async () => {
            const update1 = testEnv.userService.updateUser(testEnv.testUser.id, {
                username: `Concurrent1_${Date.now()}`
            });
            const update2 = testEnv.userService.updateUser(testEnv.testUser.id, {
                email: `concurrent.${Date.now()}@example.com`
            });
            const [result1, result2] = await Promise.all([update1, update2]);
            (0, globals_1.expect)(result1).toBeDefined();
            (0, globals_1.expect)(result2).toBeDefined();
        });
    });
    (0, globals_1.describe)('Avatar and display settings', () => {
        (0, globals_1.test)('should upload and set profile avatar', async () => {
            const updatedUser = await testEnv.userService.updateUser(testEnv.testUser.id, { profileImageUrl: testData.avatarImageUrl });
            (0, globals_1.expect)(updatedUser.profileImageUrl).toBe(testData.avatarImageUrl);
        });
        (0, globals_1.test)('should validate avatar image URL format', async () => {
            const invalidUrls = [
                'not-a-url',
                'ftp://invalid-protocol.com',
                'javascript:alert("xss")',
                ''
            ];
            for (const invalidUrl of invalidUrls) {
                await (0, globals_1.expect)(testEnv.userService.updateUser(testEnv.testUser.id, {
                    profileImageUrl: invalidUrl
                })).rejects.toThrow();
            }
        });
        (0, globals_1.test)('should remove avatar when set to null', async () => {
            await testEnv.userService.updateUser(testEnv.testUser.id, {
                profileImageUrl: testData.avatarImageUrl
            });
            const updatedUser = await testEnv.userService.updateUser(testEnv.testUser.id, { profileImageUrl: undefined });
            (0, globals_1.expect)(updatedUser.profileImageUrl).toBeUndefined();
        });
        (0, globals_1.test)('should handle display name preferences', async () => {
            const displaySettings = {
                preferences: {
                    ...testEnv.testUser.preferences,
                    displaySettings: {
                        showFullName: false,
                        showAvatar: true,
                        showOnlineStatus: false,
                        showAchievements: true
                    }
                }
            };
            const updatedUser = await testEnv.userService.updateUser(testEnv.testUser.id, displaySettings);
            (0, globals_1.expect)(updatedUser.preferences.displaySettings).toBeDefined();
            (0, globals_1.expect)(updatedUser.preferences.displaySettings.showFullName).toBe(false);
            (0, globals_1.expect)(updatedUser.preferences.displaySettings.showAvatar).toBe(true);
        });
    });
    (0, globals_1.describe)('Preferences management', () => {
        (0, globals_1.test)('should update theme preferences', async () => {
            const themes = ['light', 'dark', 'auto'];
            for (const theme of themes) {
                const updatedUser = await testEnv.userService.updateUser(testEnv.testUser.id, {
                    preferences: {
                        ...testEnv.testUser.preferences,
                        theme
                    }
                });
                (0, globals_1.expect)(updatedUser.preferences.theme).toBe(theme);
            }
        });
        (0, globals_1.test)('should manage notification preferences', async () => {
            const notificationSettings = {
                email: false,
                inApp: true,
                betting: false,
                gameResults: true,
                aiUpdates: false,
                promotions: false
            };
            const updatedUser = await testEnv.userService.updateUser(testEnv.testUser.id, {
                preferences: {
                    ...testEnv.testUser.preferences,
                    notifications: notificationSettings
                }
            });
            (0, globals_1.expect)(updatedUser.preferences.notifications).toEqual(notificationSettings);
        });
        (0, globals_1.test)('should handle game-specific preferences', async () => {
            const gameSettings = {
                autoPlay: true,
                soundEnabled: false,
                animationsEnabled: true,
                boardTheme: 'minimalist',
                showMoveHints: false,
                confirmMoves: true,
                spectatorMode: false
            };
            const updatedUser = await testEnv.userService.updateUser(testEnv.testUser.id, {
                preferences: {
                    ...testEnv.testUser.preferences,
                    gameSettings
                }
            });
            (0, globals_1.expect)(updatedUser.preferences.gameSettings).toEqual(gameSettings);
        });
        (0, globals_1.test)('should validate preference value types', async () => {
            const invalidPreferences = [
                { theme: 123 },
                { notifications: 'invalid' },
                { gameSettings: null }
            ];
            for (const invalidPref of invalidPreferences) {
                await (0, globals_1.expect)(testEnv.userService.updateUser(testEnv.testUser.id, {
                    preferences: invalidPref
                })).rejects.toThrow();
            }
        });
        (0, globals_1.test)('should merge preferences without overwriting unspecified fields', async () => {
            const originalPreferences = testEnv.testUser.preferences;
            const partialUpdate = {
                preferences: {
                    theme: 'light'
                }
            };
            const updatedUser = await testEnv.userService.updateUser(testEnv.testUser.id, partialUpdate);
            (0, globals_1.expect)(updatedUser.preferences.theme).toBe('light');
            (0, globals_1.expect)(updatedUser.preferences.notifications).toEqual(originalPreferences.notifications);
        });
    });
    (0, globals_1.describe)('Balance tracking and updates', () => {
        (0, globals_1.test)('should update SOL balance correctly', async () => {
            const initialBalance = testEnv.testUser.solBalance;
            const updatedUser = await testEnv.userService.updateBalance(testEnv.testUser.id, { solBalance: balanceTestData.positiveChange });
            (0, globals_1.expect)(updatedUser.solBalance).toBe(initialBalance + balanceTestData.positiveChange);
        });
        (0, globals_1.test)('should update betting balance correctly', async () => {
            const initialBalance = testEnv.testUser.bettingBalance;
            const updatedUser = await testEnv.userService.updateBalance(testEnv.testUser.id, { bettingBalance: balanceTestData.positiveChange });
            (0, globals_1.expect)(updatedUser.bettingBalance).toBe(initialBalance + balanceTestData.positiveChange);
        });
        (0, globals_1.test)('should handle negative balance changes', async () => {
            await testEnv.userService.updateBalance(testEnv.testUser.id, {
                solBalance: balanceTestData.largeTransaction
            });
            const updatedUser = await testEnv.userService.updateBalance(testEnv.testUser.id, { solBalance: balanceTestData.negativeChange });
            (0, globals_1.expect)(updatedUser.solBalance).toBeGreaterThan(0);
        });
        (0, globals_1.test)('should prevent balance from going below zero', async () => {
            await (0, globals_1.expect)(testEnv.userService.updateBalance(testEnv.testUser.id, {
                solBalance: -1000
            })).rejects.toThrow();
        });
        (0, globals_1.test)('should handle concurrent balance updates', async () => {
            const update1 = testEnv.userService.updateBalance(testEnv.testUser.id, {
                solBalance: 1.0
            });
            const update2 = testEnv.userService.updateBalance(testEnv.testUser.id, {
                bettingBalance: 0.5
            });
            const [result1, result2] = await Promise.all([update1, update2]);
            (0, globals_1.expect)(result1).toBeDefined();
            (0, globals_1.expect)(result2).toBeDefined();
        });
        (0, globals_1.test)('should track balance history', async () => {
            const balanceChanges = [
                { solBalance: 2.5 },
                { solBalance: -1.0 },
                { bettingBalance: 1.5 },
                { bettingBalance: -0.5 }
            ];
            for (const change of balanceChanges) {
                await testEnv.userService.updateBalance(testEnv.testUser.id, change);
            }
            const finalUser = await testEnv.userService.getUserById(testEnv.testUser.id);
            (0, globals_1.expect)(finalUser).toBeDefined();
        });
        (0, globals_1.test)('should validate balance precision to prevent floating point errors', async () => {
            const preciseBalance = 1.123456789;
            const updatedUser = await testEnv.userService.updateBalance(testEnv.testUser.id, { solBalance: preciseBalance });
            (0, globals_1.expect)(Number(updatedUser.solBalance.toFixed(6))).toBe(Number((testEnv.testUser.solBalance + preciseBalance).toFixed(6)));
        });
    });
    (0, globals_1.describe)('Betting history access', () => {
        (0, globals_1.beforeEach)(async () => {
            for (const bet of bettingHistoryData.testBets) {
                await (0, database_1.query)(`
          INSERT INTO bets (id, user_id, amount_sol, outcome, game_id, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [bet.id, testEnv.testUser.id, bet.amount, bet.outcome, bet.gameId, bet.createdAt]);
            }
        });
        (0, globals_1.afterEach)(async () => {
            await (0, database_1.query)('DELETE FROM bets WHERE user_id = $1', [testEnv.testUser.id]);
        });
        (0, globals_1.test)('should retrieve complete betting history', async () => {
            const history = await (0, database_1.query)(`
        SELECT * FROM bets WHERE user_id = $1 ORDER BY created_at DESC
      `, [testEnv.testUser.id]);
            (0, globals_1.expect)(history).toHaveLength(bettingHistoryData.testBets.length);
            (0, globals_1.expect)(history[0].amount_sol).toBe(bettingHistoryData.testBets[0].amount);
        });
        (0, globals_1.test)('should filter betting history by date range', async () => {
            const startDate = new Date(Date.now() - 3600000);
            const endDate = new Date();
            const history = await (0, database_1.query)(`
        SELECT * FROM bets 
        WHERE user_id = $1 AND created_at BETWEEN $2 AND $3
        ORDER BY created_at DESC
      `, [testEnv.testUser.id, startDate, endDate]);
            (0, globals_1.expect)(history.length).toBeGreaterThan(0);
            (0, globals_1.expect)(history.length).toBeLessThanOrEqual(bettingHistoryData.testBets.length);
        });
        (0, globals_1.test)('should filter betting history by outcome', async () => {
            const winHistory = await (0, database_1.query)(`
        SELECT * FROM bets 
        WHERE user_id = $1 AND outcome = $2
        ORDER BY created_at DESC
      `, [testEnv.testUser.id, 'win']);
            const expectedWins = bettingHistoryData.testBets.filter(bet => bet.outcome === 'win');
            (0, globals_1.expect)(winHistory).toHaveLength(expectedWins.length);
        });
        (0, globals_1.test)('should paginate betting history', async () => {
            const limit = 2;
            const offset = 0;
            const history = await (0, database_1.query)(`
        SELECT * FROM bets 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `, [testEnv.testUser.id, limit, offset]);
            (0, globals_1.expect)(history).toHaveLength(Math.min(limit, bettingHistoryData.testBets.length));
        });
        (0, globals_1.test)('should calculate betting statistics from history', async () => {
            const stats = await (0, database_1.query)(`
        SELECT 
          COUNT(*) as total_bets,
          SUM(amount_sol) as total_wagered,
          COUNT(CASE WHEN outcome = 'win' THEN 1 END) as wins,
          COUNT(CASE WHEN outcome = 'loss' THEN 1 END) as losses,
          AVG(amount_sol) as average_bet
        FROM bets 
        WHERE user_id = $1
      `, [testEnv.testUser.id]);
            (0, globals_1.expect)(stats[0].total_bets).toBe(bettingHistoryData.testBets.length.toString());
            (0, globals_1.expect)(parseFloat(stats[0].total_wagered)).toBeGreaterThan(0);
        });
        (0, globals_1.test)('should handle empty betting history', async () => {
            await (0, database_1.query)('DELETE FROM bets WHERE user_id = $1', [testEnv.testUser.id]);
            const history = await (0, database_1.query)(`
        SELECT * FROM bets WHERE user_id = $1
      `, [testEnv.testUser.id]);
            (0, globals_1.expect)(history).toHaveLength(0);
        });
    });
    (0, globals_1.describe)('Statistics and analytics', () => {
        (0, globals_1.beforeEach)(async () => {
            await testEnv.userService.updateUser(testEnv.testUser.id, {
                gamesPlayed: statisticsData.gamesPlayed,
                gamesWon: statisticsData.gamesWon,
                totalWinnings: statisticsData.totalWinnings
            });
        });
        (0, globals_1.test)('should calculate win rate correctly', async () => {
            const stats = await testEnv.userService.getUserStats(testEnv.testUser.id);
            const expectedWinRate = (statisticsData.gamesWon / statisticsData.gamesPlayed) * 100;
            (0, globals_1.expect)(stats.winRate).toBeCloseTo(expectedWinRate, 2);
        });
        (0, globals_1.test)('should track user ranking', async () => {
            const stats = await testEnv.userService.getUserStats(testEnv.testUser.id);
            (0, globals_1.expect)(stats.rank).toBeGreaterThan(0);
            (0, globals_1.expect)(typeof stats.rank).toBe('number');
        });
        (0, globals_1.test)('should generate comprehensive statistics summary', async () => {
            const user = await testEnv.userService.getUserById(testEnv.testUser.id);
            (0, globals_1.expect)(user).toBeDefined();
            const summary = {
                userId: user.id,
                gamesPlayed: user.gamesPlayed,
                gamesWon: user.gamesWon,
                winRate: user.gamesPlayed > 0 ? (user.gamesWon / user.gamesPlayed) * 100 : 0,
                totalWinnings: user.totalWinnings,
                totalLosses: user.totalLosses,
                netProfit: user.totalWinnings - user.totalLosses,
                eloRating: user.eloRating
            };
            (0, globals_1.expect)(summary.winRate).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(summary.winRate).toBeLessThanOrEqual(100);
            (0, globals_1.expect)(summary.eloRating).toBeGreaterThan(0);
        });
        (0, globals_1.test)('should track recent activity metrics', async () => {
            const stats = await testEnv.userService.getUserStats(testEnv.testUser.id);
            (0, globals_1.expect)(stats.recentGames).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(typeof stats.recentGames).toBe('number');
        });
        (0, globals_1.test)('should handle zero-division in statistics', async () => {
            const newWallet = web3_js_1.Keypair.generate();
            const newUser = await testEnv.userService.createUser(newWallet.publicKey.toString(), { username: `zero_stats_${Date.now()}` });
            const stats = await testEnv.userService.getUserStats(newUser.id);
            (0, globals_1.expect)(stats.winRate).toBe(0);
            (0, globals_1.expect)(stats.averageBet).toBe(0);
            await (0, database_1.query)('DELETE FROM users WHERE id = $1', [newUser.id]);
        });
        (0, globals_1.test)('should generate leaderboard rankings', async () => {
            const leaderboard = await testEnv.userService.getLeaderboard(10);
            (0, globals_1.expect)(Array.isArray(leaderboard)).toBe(true);
            (0, globals_1.expect)(leaderboard.length).toBeGreaterThan(0);
            if (leaderboard.length > 1) {
                (0, globals_1.expect)(leaderboard[0].user.eloRating).toBeGreaterThanOrEqual(leaderboard[1].user.eloRating);
            }
        });
    });
    (0, globals_1.describe)('Privacy settings enforcement', () => {
        (0, globals_1.test)('should update privacy preferences', async () => {
            const privacySettings = {
                preferences: {
                    ...testEnv.testUser.preferences,
                    privacy: privacyData
                }
            };
            const updatedUser = await testEnv.userService.updateUser(testEnv.testUser.id, privacySettings);
            (0, globals_1.expect)(updatedUser.preferences.privacy).toEqual(privacyData);
        });
        (0, globals_1.test)('should enforce profile visibility settings', async () => {
            const publicUser = await testEnv.userService.getUserById(testEnv.testUser.id);
            const publicProfile = {
                id: publicUser.id,
                username: publicUser.username,
                stats: privacyData.showStats ? {
                    gamesPlayed: publicUser.gamesPlayed,
                    gamesWon: publicUser.gamesWon,
                    winRate: publicUser.gamesPlayed > 0 ?
                        (publicUser.gamesWon / publicUser.gamesPlayed) * 100 : 0
                } : null,
                wallet: privacyData.showWallet ? publicUser.walletAddress : null
            };
            if (!privacyData.showStats) {
                (0, globals_1.expect)(publicProfile.stats).toBeNull();
            }
            if (!privacyData.showWallet) {
                (0, globals_1.expect)(publicProfile.wallet).toBeNull();
            }
        });
        (0, globals_1.test)('should handle data processing consent', async () => {
            const consentSettings = {
                preferences: {
                    ...testEnv.testUser.preferences,
                    privacy: {
                        ...privacyData,
                        dataProcessingConsent: false
                    }
                }
            };
            const updatedUser = await testEnv.userService.updateUser(testEnv.testUser.id, consentSettings);
            (0, globals_1.expect)(updatedUser.preferences.privacy.dataProcessingConsent).toBe(false);
        });
        (0, globals_1.test)('should validate privacy setting values', async () => {
            const invalidPrivacySettings = [
                { showStats: 'invalid' },
                { showWallet: 123 },
                { allowDirectMessages: null }
            ];
            for (const invalidSetting of invalidPrivacySettings) {
                await (0, globals_1.expect)(testEnv.userService.updateUser(testEnv.testUser.id, {
                    preferences: {
                        ...testEnv.testUser.preferences,
                        privacy: invalidSetting
                    }
                })).rejects.toThrow();
            }
        });
    });
    (0, globals_1.describe)('Data export functionality', () => {
        (0, globals_1.test)('should export complete user data', async () => {
            const userData = await testEnv.userService.getUserById(testEnv.testUser.id);
            (0, globals_1.expect)(userData).toBeDefined();
            const exportData = {
                profile: {
                    id: userData.id,
                    username: userData.username,
                    email: userData.email,
                    createdAt: userData.createdAt,
                    updatedAt: userData.updatedAt
                },
                preferences: userData.preferences,
                statistics: {
                    gamesPlayed: userData.gamesPlayed,
                    gamesWon: userData.gamesWon,
                    totalWinnings: userData.totalWinnings,
                    totalLosses: userData.totalLosses,
                    eloRating: userData.eloRating
                },
                balances: {
                    solBalance: userData.solBalance,
                    bettingBalance: userData.bettingBalance
                }
            };
            (0, globals_1.expect)(exportData.profile.id).toBe(testEnv.testUser.id);
            (0, globals_1.expect)(exportData.preferences).toBeDefined();
            (0, globals_1.expect)(exportData.statistics).toBeDefined();
            (0, globals_1.expect)(exportData.balances).toBeDefined();
        });
        (0, globals_1.test)('should export data in JSON format', async () => {
            const userData = await testEnv.userService.getUserById(testEnv.testUser.id);
            const exportJson = JSON.stringify(userData, null, 2);
            (0, globals_1.expect)(() => JSON.parse(exportJson)).not.toThrow();
            const parsedData = JSON.parse(exportJson);
            (0, globals_1.expect)(parsedData.id).toBe(testEnv.testUser.id);
        });
        (0, globals_1.test)('should exclude sensitive data from export', async () => {
            const userData = await testEnv.userService.getUserById(testEnv.testUser.id);
            const sanitizedExport = {
                ...userData,
                id: '[ANONYMIZED]',
                walletAddress: userData.walletAddress.slice(0, 8) + '...'
            };
            (0, globals_1.expect)(sanitizedExport.id).toBe('[ANONYMIZED]');
            (0, globals_1.expect)(sanitizedExport.walletAddress).toContain('...');
        });
        (0, globals_1.test)('should include betting history in export', async () => {
            await (0, database_1.query)(`
        INSERT INTO bets (id, user_id, amount_sol, outcome, game_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [(0, uuid_1.v4)(), testEnv.testUser.id, 1.5, 'win', (0, uuid_1.v4)(), new Date()]);
            const bettingHistory = await (0, database_1.query)(`
        SELECT * FROM bets WHERE user_id = $1 ORDER BY created_at DESC
      `, [testEnv.testUser.id]);
            (0, globals_1.expect)(bettingHistory.length).toBeGreaterThan(0);
            await (0, database_1.query)('DELETE FROM bets WHERE user_id = $1', [testEnv.testUser.id]);
        });
    });
    (0, globals_1.describe)('Account deletion workflow', () => {
        (0, globals_1.test)('should soft delete user account', async () => {
            const tempWallet = web3_js_1.Keypair.generate();
            const tempUser = await testEnv.userService.createUser(tempWallet.publicKey.toString(), { username: `temp_delete_${Date.now()}` });
            await testEnv.userService.updateUser(tempUser.id, { isActive: false });
            const deletedUser = await testEnv.userService.getUserById(tempUser.id);
            (0, globals_1.expect)(deletedUser).toBeNull();
            await (0, database_1.query)('DELETE FROM users WHERE id = $1', [tempUser.id]);
        });
        (0, globals_1.test)('should handle deletion of user with betting history', async () => {
            const tempWallet = web3_js_1.Keypair.generate();
            const tempUser = await testEnv.userService.createUser(tempWallet.publicKey.toString(), { username: `temp_with_bets_${Date.now()}` });
            await (0, database_1.query)(`
        INSERT INTO bets (id, user_id, amount_sol, outcome, game_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [(0, uuid_1.v4)(), tempUser.id, 1.0, 'win', (0, uuid_1.v4)(), new Date()]);
            await testEnv.userService.updateUser(tempUser.id, { isActive: false });
            const bettingHistory = await (0, database_1.query)(`
        SELECT * FROM bets WHERE user_id = $1
      `, [tempUser.id]);
            (0, globals_1.expect)(bettingHistory.length).toBeGreaterThan(0);
            await (0, database_1.query)('DELETE FROM bets WHERE user_id = $1', [tempUser.id]);
            await (0, database_1.query)('DELETE FROM users WHERE id = $1', [tempUser.id]);
        });
        (0, globals_1.test)('should require confirmation for account deletion', async () => {
            const confirmationToken = jsonwebtoken_1.default.sign({ userId: testEnv.testUser.id, action: 'delete_account' }, process.env.JWT_SECRET || 'test-jwt-secret', { expiresIn: '15m' });
            (0, globals_1.expect)(confirmationToken).toBeDefined();
            const decoded = jsonwebtoken_1.default.verify(confirmationToken, process.env.JWT_SECRET || 'test-jwt-secret');
            (0, globals_1.expect)(decoded.userId).toBe(testEnv.testUser.id);
            (0, globals_1.expect)(decoded.action).toBe('delete_account');
        });
        (0, globals_1.test)('should anonymize user data on deletion request', async () => {
            const tempWallet = web3_js_1.Keypair.generate();
            const tempUser = await testEnv.userService.createUser(tempWallet.publicKey.toString(), {
                username: `temp_anon_${Date.now()}`,
                email: `temp.anon.${Date.now()}@example.com`
            });
            const anonymizedData = {
                username: `[DELETED_USER_${tempUser.id.slice(0, 8)}]`,
                email: undefined,
                profileImageUrl: undefined,
                isActive: false
            };
            await testEnv.userService.updateUser(tempUser.id, anonymizedData);
            const anonymizedUser = await (0, database_1.query)(`
        SELECT * FROM users WHERE id = $1
      `, [tempUser.id]);
            (0, globals_1.expect)(anonymizedUser[0].username).toContain('[DELETED_USER_');
            (0, globals_1.expect)(anonymizedUser[0].email).toBeNull();
            await (0, database_1.query)('DELETE FROM users WHERE id = $1', [tempUser.id]);
        });
    });
    (0, globals_1.describe)('Profile data validation', () => {
        (0, globals_1.test)('should validate username format requirements', async () => {
            const invalidUsernames = [
                'a',
                'a'.repeat(51),
                'user@invalid',
                'user name',
                '123user',
                '',
                null,
                undefined
            ];
            for (const invalidUsername of invalidUsernames) {
                await (0, globals_1.expect)(testEnv.userService.updateUser(testEnv.testUser.id, {
                    username: invalidUsername
                })).rejects.toThrow();
            }
        });
        (0, globals_1.test)('should validate email format requirements', async () => {
            const invalidEmails = [
                'invalid-email',
                '@domain.com',
                'user@',
                'user@domain',
                'user..double@domain.com',
                'user@domain..com',
                ' user@domain.com ',
                'user@domain.com.',
                'a'.repeat(255) + '@domain.com'
            ];
            for (const invalidEmail of invalidEmails) {
                await (0, globals_1.expect)(testEnv.userService.updateUser(testEnv.testUser.id, {
                    email: invalidEmail
                })).rejects.toThrow();
            }
        });
        (0, globals_1.test)('should validate wallet address format', async () => {
            const invalidWallets = [
                'invalid-wallet',
                '0x1234567890abcdef',
                'wallet123',
                '',
                'a'.repeat(100),
                'InvalidBase58Characters!'
            ];
            for (const invalidWallet of invalidWallets) {
                await (0, globals_1.expect)(testEnv.userService.createUser(invalidWallet, {
                    username: `test_${Date.now()}`
                })).rejects.toThrow();
            }
        });
        (0, globals_1.test)('should validate preference value types and ranges', async () => {
            const invalidPreferences = [
                { theme: 123 },
                { theme: 'invalid-theme' },
                { notifications: 'string' },
                { gameSettings: null },
                { privacy: [] }
            ];
            for (const invalidPref of invalidPreferences) {
                await (0, globals_1.expect)(testEnv.userService.updateUser(testEnv.testUser.id, {
                    preferences: invalidPref
                })).rejects.toThrow();
            }
        });
        (0, globals_1.test)('should sanitize input data', async () => {
            const maliciousInputs = {
                username: '<script>alert("xss")</script>',
                email: 'test+<script>@example.com'
            };
            try {
                const result = await testEnv.userService.updateUser(testEnv.testUser.id, maliciousInputs);
                (0, globals_1.expect)(result.username).not.toContain('<script>');
                (0, globals_1.expect)(result.email).not.toContain('<script>');
            }
            catch (error) {
                (0, globals_1.expect)(error).toBeDefined();
            }
        });
        (0, globals_1.test)('should enforce data length limits', async () => {
            const oversizedData = {
                username: 'a'.repeat(256),
                email: 'a'.repeat(250) + '@example.com'
            };
            await (0, globals_1.expect)(testEnv.userService.updateUser(testEnv.testUser.id, oversizedData)).rejects.toThrow();
        });
        (0, globals_1.test)('should validate required fields during creation', async () => {
            const invalidCreationData = [
                { walletAddress: '' },
                { walletAddress: null },
                { walletAddress: undefined }
            ];
            for (const invalidData of invalidCreationData) {
                await (0, globals_1.expect)(testEnv.userService.createUser(invalidData.walletAddress, { username: 'test' })).rejects.toThrow();
            }
        });
        (0, globals_1.test)('should handle edge cases in numeric fields', async () => {
            const edgeCases = [
                { solBalance: Number.MAX_SAFE_INTEGER },
                { solBalance: Number.MIN_SAFE_INTEGER },
                { solBalance: NaN },
                { solBalance: Infinity },
                { solBalance: -Infinity }
            ];
            for (const edgeCase of edgeCases) {
                try {
                    await testEnv.userService.updateBalance(testEnv.testUser.id, edgeCase);
                    const user = await testEnv.userService.getUserById(testEnv.testUser.id);
                    (0, globals_1.expect)(user.solBalance).toBeGreaterThan(-Infinity);
                    (0, globals_1.expect)(user.solBalance).toBeLessThan(Infinity);
                    (0, globals_1.expect)(user.solBalance).toBeGreaterThanOrEqual(0);
                }
                catch (error) {
                    (0, globals_1.expect)(error).toBeDefined();
                }
            }
        });
    });
    (0, globals_1.describe)('Integration and performance', () => {
        (0, globals_1.test)('should handle high-frequency profile updates', async () => {
            const updates = Array.from({ length: 50 }, (_, i) => ({
                username: `speed_test_${i}_${Date.now()}`
            }));
            const startTime = Date.now();
            for (const update of updates) {
                await testEnv.userService.updateUser(testEnv.testUser.id, update);
            }
            const endTime = Date.now();
            const duration = endTime - startTime;
            (0, globals_1.expect)(duration).toBeLessThan(10000);
        });
        (0, globals_1.test)('should maintain data consistency across concurrent operations', async () => {
            const operations = [
                testEnv.userService.updateUser(testEnv.testUser.id, {
                    username: `concurrent_1_${Date.now()}`
                }),
                testEnv.userService.updateBalance(testEnv.testUser.id, {
                    solBalance: 1.0
                }),
                testEnv.userService.updateUser(testEnv.testUser.id, {
                    preferences: { theme: 'dark' }
                }),
                testEnv.userService.updateBalance(testEnv.testUser.id, {
                    bettingBalance: 0.5
                })
            ];
            const results = await Promise.all(operations);
            results.forEach(result => {
                (0, globals_1.expect)(result).toBeDefined();
            });
            const finalUser = await testEnv.userService.getUserById(testEnv.testUser.id);
            (0, globals_1.expect)(finalUser).toBeDefined();
        });
        (0, globals_1.test)('should handle database connection failures gracefully', async () => {
            try {
                const result = await testEnv.userService.getUserById(testEnv.testUser.id);
                (0, globals_1.expect)(result).toBeDefined();
            }
            catch (error) {
                (0, globals_1.expect)(error).toBeInstanceOf(Error);
            }
        });
        (0, globals_1.test)('should cache frequently accessed data', async () => {
            await testEnv.redisClient.flushdb();
            const startTime1 = Date.now();
            const user1 = await testEnv.userService.getUserById(testEnv.testUser.id);
            const duration1 = Date.now() - startTime1;
            const startTime2 = Date.now();
            const user2 = await testEnv.userService.getUserById(testEnv.testUser.id);
            const duration2 = Date.now() - startTime2;
            (0, globals_1.expect)(user1).toEqual(user2);
            (0, globals_1.expect)(duration2).toBeLessThanOrEqual(duration1 + 10);
        });
    });
});
//# sourceMappingURL=profile-management.test.js.map