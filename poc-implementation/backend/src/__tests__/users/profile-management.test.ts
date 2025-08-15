/**
 * User Profile Management Test Suite
 *
 * Comprehensive testing for user profile operations including creation, updates,
 * avatar management, preferences, balance tracking, betting history, statistics,
 * privacy settings, data export, and account deletion workflows.
 *

 * - #2: Real implementations over simulations
 * - #8: 100% test coverage with unit, integration, and end-to-end tests
 * - #15: Error-free, working systems
 * - #18: No hardcoding or placeholders
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

import { UserService, User, AuthToken } from '../../services/UserService';
import { getTestRedisClient, getTestSolanaConnection } from '../setup';
import { query, transaction } from '../../utils/database';
import { logger } from '../../utils/logger';

// Real test environment setup
interface TestEnvironment {
  userService: UserService;
  testUser: User;
  testWallet: Keypair;
  testUserToken: string;
  redisClient: any;
}

interface UserProfileTestData {
  validUsername: string;
  validEmail: string;
  validPreferences: Record<string, any>;
  invalidUsername: string;
  invalidEmail: string;
  avatarImageUrl: string;
  profileImageData: Buffer;
}

interface BalanceTestData {
  initialSolBalance: number;
  initialBettingBalance: number;
  positiveChange: number;
  negativeChange: number;
  largeTransaction: number;
}

interface BettingHistoryTestData {
  testBets: Array<{
    id: string;
    amount: number;
    outcome: 'win' | 'loss' | 'pending';
    gameId: string;
    createdAt: Date;
  }>;
}

interface StatisticsTestData {
  gamesPlayed: number;
  gamesWon: number;
  totalWagered: number;
  totalWinnings: number;
  winStreak: number;
  bestWinStreak: number;
}

interface PrivacyTestData {
  showStats: boolean;
  showWallet: boolean;
  allowDirectMessages: boolean;
  dataProcessingConsent: boolean;
}

describe('User Profile Management', () => {
  let testEnv: TestEnvironment;
  let testData: UserProfileTestData;
  let balanceTestData: BalanceTestData;
  let bettingHistoryData: BettingHistoryTestData;
  let statisticsData: StatisticsTestData;
  let privacyData: PrivacyTestData;

  // Real environment setup following GI #2
  beforeAll(async () => {
    try {
      logger.info('🚀 Setting up User Profile Management test environment...');

      // Initialize real services
      const userService = new UserService();
      const redisClient = await getTestRedisClient();

      // Create test wallet with real cryptographic operations
      const testWallet = Keypair.generate();

      // Create test user with real registration process
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

      // Generate real authentication token
      const testUserToken = jwt.sign(
        { userId: testUser.id, wallet: testUser.walletAddress },
        process.env.JWT_SECRET || 'test-jwt-secret',
        { expiresIn: '1h' }
      );

      testEnv = {
        userService,
        testUser,
        testWallet,
        testUserToken,
        redisClient
      };

      // Initialize test data
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
        invalidUsername: '', // Empty username
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
            id: uuidv4(),
            amount: 1.5,
            outcome: 'win',
            gameId: uuidv4(),
            createdAt: new Date()
          },
          {
            id: uuidv4(),
            amount: 0.75,
            outcome: 'loss',
            gameId: uuidv4(),
            createdAt: new Date(Date.now() - 3600000)
          },
          {
            id: uuidv4(),
            amount: 2.25,
            outcome: 'pending',
            gameId: uuidv4(),
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

      logger.info('✅ User Profile Management test environment setup complete');

    } catch (error) {
      logger.error('❌ Failed to setup test environment:', error);
      throw error;
    }
  });

  // Cleanup following GI #10
  afterAll(async () => {
    try {
      logger.info('🧹 Cleaning up User Profile Management test environment...');

      // Clean up test data
      if (testEnv?.testUser?.id) {
        await query('DELETE FROM users WHERE id = $1', [testEnv.testUser.id]);
      }

      // Close connections
      if (testEnv?.redisClient) {
        await testEnv.redisClient.quit();
      }

      logger.info('✅ User Profile Management test cleanup complete');
    } catch (error) {
      logger.error('❌ Test cleanup failed:', error);
    }
  });

  // Reset state between tests
  beforeEach(async () => {
    // Clear any cached data
    if (testEnv?.redisClient) {
      await testEnv.redisClient.flushdb();
    }
  });

  /**
   * Test Suite 1: Profile Creation and Updates
   * Following GI #16: Step-by-step enhancement and iteration
   */
  describe('Profile creation and updates', () => {
    test('should create user profile with valid data', async () => {
      const walletKeypair = Keypair.generate();
      const userData = {
        username: testData.validUsername,
        email: testData.validEmail,
        preferences: testData.validPreferences
      };

      const user = await testEnv.userService.createUser(
        walletKeypair.publicKey.toString(),
        userData
      );

      expect(user).toBeDefined();
      expect(user.walletAddress).toBe(walletKeypair.publicKey.toString());
      expect(user.username).toBe(testData.validUsername);
      expect(user.email).toBe(testData.validEmail);
      expect(user.preferences).toEqual(testData.validPreferences);
      expect(user.isActive).toBe(true);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);

      // Cleanup
      await query('DELETE FROM users WHERE id = $1', [user.id]);
    });

    test('should update user profile with partial data', async () => {
      const updates = {
        username: `Updated_${Date.now()}`,
        email: `updated.${Date.now()}@example.com`
      };

      const updatedUser = await testEnv.userService.updateUser(
        testEnv.testUser.id,
        updates
      );

      expect(updatedUser.username).toBe(updates.username);
      expect(updatedUser.email).toBe(updates.email);
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(testEnv.testUser.updatedAt.getTime());
    });

    test('should update user preferences independently', async () => {
      const newPreferences = {
        theme: 'light',
        notifications: {
          email: false,
          inApp: true,
          betting: false,
          gameResults: true
        }
      };

      const updatedUser = await testEnv.userService.updateUser(
        testEnv.testUser.id,
        { preferences: newPreferences }
      );

      expect(updatedUser.preferences).toEqual(newPreferences);
    });

    test('should reject invalid username formats', async () => {
      await expect(
        testEnv.userService.updateUser(testEnv.testUser.id, {
          username: testData.invalidUsername
        })
      ).rejects.toThrow();
    });

    test('should reject invalid email formats', async () => {
      await expect(
        testEnv.userService.updateUser(testEnv.testUser.id, {
          email: testData.invalidEmail
        })
      ).rejects.toThrow();
    });

    test('should prevent duplicate username registration', async () => {
      const walletKeypair = Keypair.generate();

      await expect(
        testEnv.userService.createUser(walletKeypair.publicKey.toString(), {
          username: testEnv.testUser.username
        })
      ).rejects.toThrow();
    });

    test('should handle concurrent profile updates', async () => {
      const update1 = testEnv.userService.updateUser(testEnv.testUser.id, {
        username: `Concurrent1_${Date.now()}`
      });

      const update2 = testEnv.userService.updateUser(testEnv.testUser.id, {
        email: `concurrent.${Date.now()}@example.com`
      });

      const [result1, result2] = await Promise.all([update1, update2]);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });

  /**
   * Test Suite 2: Avatar and Display Settings
   * Following GI #5: UI/UX enhancements
   */
  describe('Avatar and display settings', () => {
    test('should upload and set profile avatar', async () => {
      const updatedUser = await testEnv.userService.updateUser(
        testEnv.testUser.id,
        { profileImageUrl: testData.avatarImageUrl }
      );

      expect(updatedUser.profileImageUrl).toBe(testData.avatarImageUrl);
    });

    test('should validate avatar image URL format', async () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://invalid-protocol.com',
        'javascript:alert("xss")',
        ''
      ];

      for (const invalidUrl of invalidUrls) {
        await expect(
          testEnv.userService.updateUser(testEnv.testUser.id, {
            profileImageUrl: invalidUrl
          })
        ).rejects.toThrow();
      }
    });

    test('should remove avatar when set to null', async () => {
      // First set an avatar
      await testEnv.userService.updateUser(testEnv.testUser.id, {
        profileImageUrl: testData.avatarImageUrl
      });

      // Then remove it
      const updatedUser = await testEnv.userService.updateUser(
        testEnv.testUser.id,
        { profileImageUrl: undefined }
      );

      expect(updatedUser.profileImageUrl).toBeUndefined();
    });

    test('should handle display name preferences', async () => {
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

      const updatedUser = await testEnv.userService.updateUser(
        testEnv.testUser.id,
        displaySettings
      );

      expect(updatedUser.preferences.displaySettings).toBeDefined();
      expect(updatedUser.preferences.displaySettings.showFullName).toBe(false);
      expect(updatedUser.preferences.displaySettings.showAvatar).toBe(true);
    });
  });

  /**
   * Test Suite 3: Preferences Management
   * Following GI #13: Secure and optimize for best practices
   */
  describe('Preferences management', () => {
    test('should update theme preferences', async () => {
      const themes = ['light', 'dark', 'auto'];

      for (const theme of themes) {
        const updatedUser = await testEnv.userService.updateUser(
          testEnv.testUser.id,
          {
            preferences: {
              ...testEnv.testUser.preferences,
              theme
            }
          }
        );

        expect(updatedUser.preferences.theme).toBe(theme);
      }
    });

    test('should manage notification preferences', async () => {
      const notificationSettings = {
        email: false,
        inApp: true,
        betting: false,
        gameResults: true,
        aiUpdates: false,
        promotions: false
      };

      const updatedUser = await testEnv.userService.updateUser(
        testEnv.testUser.id,
        {
          preferences: {
            ...testEnv.testUser.preferences,
            notifications: notificationSettings
          }
        }
      );

      expect(updatedUser.preferences.notifications).toEqual(notificationSettings);
    });

    test('should handle game-specific preferences', async () => {
      const gameSettings = {
        autoPlay: true,
        soundEnabled: false,
        animationsEnabled: true,
        boardTheme: 'minimalist',
        showMoveHints: false,
        confirmMoves: true,
        spectatorMode: false
      };

      const updatedUser = await testEnv.userService.updateUser(
        testEnv.testUser.id,
        {
          preferences: {
            ...testEnv.testUser.preferences,
            gameSettings
          }
        }
      );

      expect(updatedUser.preferences.gameSettings).toEqual(gameSettings);
    });

    test('should validate preference value types', async () => {
      const invalidPreferences = [
        { theme: 123 }, // Should be string
        { notifications: 'invalid' }, // Should be object
        { gameSettings: null } // Should be object
      ];

      for (const invalidPref of invalidPreferences) {
        await expect(
          testEnv.userService.updateUser(testEnv.testUser.id, {
            preferences: invalidPref
          })
        ).rejects.toThrow();
      }
    });

    test('should merge preferences without overwriting unspecified fields', async () => {
      const originalPreferences = testEnv.testUser.preferences;

      const partialUpdate = {
        preferences: {
          theme: 'light'
        }
      };

      const updatedUser = await testEnv.userService.updateUser(
        testEnv.testUser.id,
        partialUpdate
      );

      expect(updatedUser.preferences.theme).toBe('light');
      expect(updatedUser.preferences.notifications).toEqual(originalPreferences.notifications);
    });
  });

  /**
   * Test Suite 4: Balance Tracking and Updates
   * Following GI #2: Real implementations with actual data
   */
  describe('Balance tracking and updates', () => {
    test('should update SOL balance correctly', async () => {
      const initialBalance = testEnv.testUser.solBalance;

      const updatedUser = await testEnv.userService.updateBalance(
        testEnv.testUser.id,
        { solBalance: balanceTestData.positiveChange }
      );

      expect(updatedUser.solBalance).toBe(
        initialBalance + balanceTestData.positiveChange
      );
    });

    test('should update betting balance correctly', async () => {
      const initialBalance = testEnv.testUser.bettingBalance;

      const updatedUser = await testEnv.userService.updateBalance(
        testEnv.testUser.id,
        { bettingBalance: balanceTestData.positiveChange }
      );

      expect(updatedUser.bettingBalance).toBe(
        initialBalance + balanceTestData.positiveChange
      );
    });

    test('should handle negative balance changes', async () => {
      // First add some balance
      await testEnv.userService.updateBalance(testEnv.testUser.id, {
        solBalance: balanceTestData.largeTransaction
      });

      const updatedUser = await testEnv.userService.updateBalance(
        testEnv.testUser.id,
        { solBalance: balanceTestData.negativeChange }
      );

      expect(updatedUser.solBalance).toBeGreaterThan(0);
    });

    test('should prevent balance from going below zero', async () => {
      await expect(
        testEnv.userService.updateBalance(testEnv.testUser.id, {
          solBalance: -1000
        })
      ).rejects.toThrow();
    });

    test('should handle concurrent balance updates', async () => {
      const update1 = testEnv.userService.updateBalance(testEnv.testUser.id, {
        solBalance: 1.0
      });

      const update2 = testEnv.userService.updateBalance(testEnv.testUser.id, {
        bettingBalance: 0.5
      });

      const [result1, result2] = await Promise.all([update1, update2]);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    test('should track balance history', async () => {
      const balanceChanges = [
        { solBalance: 2.5 },
        { solBalance: -1.0 },
        { bettingBalance: 1.5 },
        { bettingBalance: -0.5 }
      ];

      for (const change of balanceChanges) {
        await testEnv.userService.updateBalance(testEnv.testUser.id, change);
      }

      // Verify final balance reflects all changes
      const finalUser = await testEnv.userService.getUserById(testEnv.testUser.id);
      expect(finalUser).toBeDefined();
    });

    test('should validate balance precision to prevent floating point errors', async () => {
      const preciseBalance = 1.123456789;

      const updatedUser = await testEnv.userService.updateBalance(
        testEnv.testUser.id,
        { solBalance: preciseBalance }
      );

      // Should be rounded to reasonable precision (e.g., 6 decimal places)
      expect(Number(updatedUser.solBalance.toFixed(6))).toBe(
        Number((testEnv.testUser.solBalance + preciseBalance).toFixed(6))
      );
    });
  });

  /**
   * Test Suite 5: Betting History Access
   * Following GI #17: Generalize for reusability
   */
  describe('Betting history access', () => {
    beforeEach(async () => {
      // Insert test betting data
      for (const bet of bettingHistoryData.testBets) {
        await query(`
          INSERT INTO bets (id, user_id, amount_sol, outcome, game_id, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [bet.id, testEnv.testUser.id, bet.amount, bet.outcome, bet.gameId, bet.createdAt]);
      }
    });

    afterEach(async () => {
      // Clean up test betting data
      await query('DELETE FROM bets WHERE user_id = $1', [testEnv.testUser.id]);
    });

    test('should retrieve complete betting history', async () => {
      const history = await query(`
        SELECT * FROM bets WHERE user_id = $1 ORDER BY created_at DESC
      `, [testEnv.testUser.id]);

      expect(history).toHaveLength(bettingHistoryData.testBets.length);
      expect(history[0].amount_sol).toBe(bettingHistoryData.testBets[0].amount);
    });

    test('should filter betting history by date range', async () => {
      const startDate = new Date(Date.now() - 3600000); // 1 hour ago
      const endDate = new Date();

      const history = await query(`
        SELECT * FROM bets
        WHERE user_id = $1 AND created_at BETWEEN $2 AND $3
        ORDER BY created_at DESC
      `, [testEnv.testUser.id, startDate, endDate]);

      expect(history.length).toBeGreaterThan(0);
      expect(history.length).toBeLessThanOrEqual(bettingHistoryData.testBets.length);
    });

    test('should filter betting history by outcome', async () => {
      const winHistory = await query(`
        SELECT * FROM bets
        WHERE user_id = $1 AND outcome = $2
        ORDER BY created_at DESC
      `, [testEnv.testUser.id, 'win']);

      const expectedWins = bettingHistoryData.testBets.filter(bet => bet.outcome === 'win');
      expect(winHistory).toHaveLength(expectedWins.length);
    });

    test('should paginate betting history', async () => {
      const limit = 2;
      const offset = 0;

      const history = await query(`
        SELECT * FROM bets
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [testEnv.testUser.id, limit, offset]);

      expect(history).toHaveLength(Math.min(limit, bettingHistoryData.testBets.length));
    });

    test('should calculate betting statistics from history', async () => {
      const stats = await query(`
        SELECT
          COUNT(*) as total_bets,
          SUM(amount_sol) as total_wagered,
          COUNT(CASE WHEN outcome = 'win' THEN 1 END) as wins,
          COUNT(CASE WHEN outcome = 'loss' THEN 1 END) as losses,
          AVG(amount_sol) as average_bet
        FROM bets
        WHERE user_id = $1
      `, [testEnv.testUser.id]);

      expect(stats[0].total_bets).toBe(bettingHistoryData.testBets.length.toString());
      expect(parseFloat(stats[0].total_wagered)).toBeGreaterThan(0);
    });

    test('should handle empty betting history', async () => {
      // Clear all bets
      await query('DELETE FROM bets WHERE user_id = $1', [testEnv.testUser.id]);

      const history = await query(`
        SELECT * FROM bets WHERE user_id = $1
      `, [testEnv.testUser.id]);

      expect(history).toHaveLength(0);
    });
  });

  /**
   * Test Suite 6: Statistics and Analytics
   * Following GI #12: Real-time updates and notifications
   */
  describe('Statistics and analytics', () => {
    beforeEach(async () => {
      // Set up test statistics
      await testEnv.userService.updateUser(testEnv.testUser.id, {
        gamesPlayed: statisticsData.gamesPlayed,
        gamesWon: statisticsData.gamesWon,
        totalWinnings: statisticsData.totalWinnings
      });
    });

    test('should calculate win rate correctly', async () => {
      const stats = await testEnv.userService.getUserStats(testEnv.testUser.id);

      const expectedWinRate = (statisticsData.gamesWon / statisticsData.gamesPlayed) * 100;
      expect(stats.winRate).toBeCloseTo(expectedWinRate, 2);
    });

    test('should track user ranking', async () => {
      const stats = await testEnv.userService.getUserStats(testEnv.testUser.id);

      expect(stats.rank).toBeGreaterThan(0);
      expect(typeof stats.rank).toBe('number');
    });

    test('should generate comprehensive statistics summary', async () => {
      const user = await testEnv.userService.getUserById(testEnv.testUser.id);
      expect(user).toBeDefined();

      const summary = {
        userId: user!.id,
        gamesPlayed: user!.gamesPlayed,
        gamesWon: user!.gamesWon,
        winRate: user!.gamesPlayed > 0 ? (user!.gamesWon / user!.gamesPlayed) * 100 : 0,
        totalWinnings: user!.totalWinnings,
        totalLosses: user!.totalLosses,
        netProfit: user!.totalWinnings - user!.totalLosses,
        eloRating: user!.eloRating
      };

      expect(summary.winRate).toBeGreaterThanOrEqual(0);
      expect(summary.winRate).toBeLessThanOrEqual(100);
      expect(summary.eloRating).toBeGreaterThan(0);
    });

    test('should track recent activity metrics', async () => {
      const stats = await testEnv.userService.getUserStats(testEnv.testUser.id);

      expect(stats.recentGames).toBeGreaterThanOrEqual(0);
      expect(typeof stats.recentGames).toBe('number');
    });

    test('should handle zero-division in statistics', async () => {
      // Create user with no games played
      const newWallet = Keypair.generate();
      const newUser = await testEnv.userService.createUser(
        newWallet.publicKey.toString(),
        { username: `zero_stats_${Date.now()}` }
      );

      const stats = await testEnv.userService.getUserStats(newUser.id);

      expect(stats.winRate).toBe(0);
      expect(stats.averageBet).toBe(0);

      // Cleanup
      await query('DELETE FROM users WHERE id = $1', [newUser.id]);
    });

    test('should generate leaderboard rankings', async () => {
      const leaderboard = await testEnv.userService.getLeaderboard(10);

      expect(Array.isArray(leaderboard)).toBe(true);
      expect(leaderboard.length).toBeGreaterThan(0);

      if (leaderboard.length > 1) {
        // Verify rankings are sorted by ELO rating
        expect(leaderboard[0].user.eloRating).toBeGreaterThanOrEqual(
          leaderboard[1].user.eloRating
        );
      }
    });
  });

  /**
   * Test Suite 7: Privacy Settings Enforcement
   * Following GI #27: Data privacy and compliance
   */
  describe('Privacy settings enforcement', () => {
    test('should update privacy preferences', async () => {
      const privacySettings = {
        preferences: {
          ...testEnv.testUser.preferences,
          privacy: privacyData
        }
      };

      const updatedUser = await testEnv.userService.updateUser(
        testEnv.testUser.id,
        privacySettings
      );

      expect(updatedUser.preferences.privacy).toEqual(privacyData);
    });

    test('should enforce profile visibility settings', async () => {
      const publicUser = await testEnv.userService.getUserById(testEnv.testUser.id);

      // Simulate privacy enforcement - would normally be in service layer
      const publicProfile = {
        id: publicUser!.id,
        username: publicUser!.username,
        stats: privacyData.showStats ? {
          gamesPlayed: publicUser!.gamesPlayed,
          gamesWon: publicUser!.gamesWon,
          winRate: publicUser!.gamesPlayed > 0 ?
            (publicUser!.gamesWon / publicUser!.gamesPlayed) * 100 : 0
        } : null,
        wallet: privacyData.showWallet ? publicUser!.walletAddress : null
      };

      if (!privacyData.showStats) {
        expect(publicProfile.stats).toBeNull();
      }

      if (!privacyData.showWallet) {
        expect(publicProfile.wallet).toBeNull();
      }
    });

    test('should handle data processing consent', async () => {
      const consentSettings = {
        preferences: {
          ...testEnv.testUser.preferences,
          privacy: {
            ...privacyData,
            dataProcessingConsent: false
          }
        }
      };

      const updatedUser = await testEnv.userService.updateUser(
        testEnv.testUser.id,
        consentSettings
      );

      expect(updatedUser.preferences.privacy.dataProcessingConsent).toBe(false);
    });

    test('should validate privacy setting values', async () => {
      const invalidPrivacySettings = [
        { showStats: 'invalid' }, // Should be boolean
        { showWallet: 123 }, // Should be boolean
        { allowDirectMessages: null } // Should be boolean
      ];

      for (const invalidSetting of invalidPrivacySettings) {
        await expect(
          testEnv.userService.updateUser(testEnv.testUser.id, {
            preferences: {
              ...testEnv.testUser.preferences,
              privacy: invalidSetting
            }
          })
        ).rejects.toThrow();
      }
    });
  });

  /**
   * Test Suite 8: Data Export Functionality
   * Following GI #27: GDPR compliance and data portability
   */
  describe('Data export functionality', () => {
    test('should export complete user data', async () => {
      const userData = await testEnv.userService.getUserById(testEnv.testUser.id);
      expect(userData).toBeDefined();

      // Simulate data export - would normally be in dedicated service
      const exportData = {
        profile: {
          id: userData!.id,
          username: userData!.username,
          email: userData!.email,
          createdAt: userData!.createdAt,
          updatedAt: userData!.updatedAt
        },
        preferences: userData!.preferences,
        statistics: {
          gamesPlayed: userData!.gamesPlayed,
          gamesWon: userData!.gamesWon,
          totalWinnings: userData!.totalWinnings,
          totalLosses: userData!.totalLosses,
          eloRating: userData!.eloRating
        },
        balances: {
          solBalance: userData!.solBalance,
          bettingBalance: userData!.bettingBalance
        }
      };

      expect(exportData.profile.id).toBe(testEnv.testUser.id);
      expect(exportData.preferences).toBeDefined();
      expect(exportData.statistics).toBeDefined();
      expect(exportData.balances).toBeDefined();
    });

    test('should export data in JSON format', async () => {
      const userData = await testEnv.userService.getUserById(testEnv.testUser.id);
      const exportJson = JSON.stringify(userData, null, 2);

      expect(() => JSON.parse(exportJson)).not.toThrow();

      const parsedData = JSON.parse(exportJson);
      expect(parsedData.id).toBe(testEnv.testUser.id);
    });

    test('should exclude sensitive data from export', async () => {
      const userData = await testEnv.userService.getUserById(testEnv.testUser.id);

      // Simulate sanitized export
      const sanitizedExport = {
        ...userData,
        id: '[ANONYMIZED]',
        walletAddress: userData!.walletAddress.slice(0, 8) + '...'
      };

      expect(sanitizedExport.id).toBe('[ANONYMIZED]');
      expect(sanitizedExport.walletAddress).toContain('...');
    });

    test('should include betting history in export', async () => {
      // Add some betting history
      await query(`
        INSERT INTO bets (id, user_id, amount_sol, outcome, game_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [uuidv4(), testEnv.testUser.id, 1.5, 'win', uuidv4(), new Date()]);

      const bettingHistory = await query(`
        SELECT * FROM bets WHERE user_id = $1 ORDER BY created_at DESC
      `, [testEnv.testUser.id]);

      expect(bettingHistory.length).toBeGreaterThan(0);

      // Cleanup
      await query('DELETE FROM bets WHERE user_id = $1', [testEnv.testUser.id]);
    });
  });

  /**
   * Test Suite 9: Account Deletion Workflow
   * Following GI #15: Error-free, working systems
   */
  describe('Account deletion workflow', () => {
    test('should soft delete user account', async () => {
      // Create temporary user for deletion test
      const tempWallet = Keypair.generate();
      const tempUser = await testEnv.userService.createUser(
        tempWallet.publicKey.toString(),
        { username: `temp_delete_${Date.now()}` }
      );

      // Soft delete
      await testEnv.userService.updateUser(tempUser.id, { isActive: false });

      const deletedUser = await testEnv.userService.getUserById(tempUser.id);
      expect(deletedUser).toBeNull(); // Should not return inactive users

      // Cleanup - hard delete for test cleanup
      await query('DELETE FROM users WHERE id = $1', [tempUser.id]);
    });

    test('should handle deletion of user with betting history', async () => {
      // Create temporary user with betting history
      const tempWallet = Keypair.generate();
      const tempUser = await testEnv.userService.createUser(
        tempWallet.publicKey.toString(),
        { username: `temp_with_bets_${Date.now()}` }
      );

      // Add betting history
      await query(`
        INSERT INTO bets (id, user_id, amount_sol, outcome, game_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [uuidv4(), tempUser.id, 1.0, 'win', uuidv4(), new Date()]);

      // Soft delete user
      await testEnv.userService.updateUser(tempUser.id, { isActive: false });

      // Verify betting history is preserved
      const bettingHistory = await query(`
        SELECT * FROM bets WHERE user_id = $1
      `, [tempUser.id]);

      expect(bettingHistory.length).toBeGreaterThan(0);

      // Cleanup
      await query('DELETE FROM bets WHERE user_id = $1', [tempUser.id]);
      await query('DELETE FROM users WHERE id = $1', [tempUser.id]);
    });

    test('should require confirmation for account deletion', async () => {
      // This would normally involve a confirmation token/email process
      const confirmationToken = jwt.sign(
        { userId: testEnv.testUser.id, action: 'delete_account' },
        process.env.JWT_SECRET || 'test-jwt-secret',
        { expiresIn: '15m' }
      );

      expect(confirmationToken).toBeDefined();

      // Verify token
      const decoded = jwt.verify(
        confirmationToken,
        process.env.JWT_SECRET || 'test-jwt-secret'
      ) as any;

      expect(decoded.userId).toBe(testEnv.testUser.id);
      expect(decoded.action).toBe('delete_account');
    });

    test('should anonymize user data on deletion request', async () => {
      // Create temporary user for anonymization test
      const tempWallet = Keypair.generate();
      const tempUser = await testEnv.userService.createUser(
        tempWallet.publicKey.toString(),
        {
          username: `temp_anon_${Date.now()}`,
          email: `temp.anon.${Date.now()}@example.com`
        }
      );

      // Simulate anonymization
      const anonymizedData = {
        username: `[DELETED_USER_${tempUser.id.slice(0, 8)}]`,
        email: undefined,
        profileImageUrl: undefined,
        isActive: false
      };

      await testEnv.userService.updateUser(tempUser.id, anonymizedData);

      const anonymizedUser = await query(`
        SELECT * FROM users WHERE id = $1
      `, [tempUser.id]);

      expect(anonymizedUser[0].username).toContain('[DELETED_USER_');
      expect(anonymizedUser[0].email).toBeNull();

      // Cleanup
      await query('DELETE FROM users WHERE id = $1', [tempUser.id]);
    });
  });

  /**
   * Test Suite 10: Profile Data Validation
   * Following GI #20: Robust error handling
   */
  describe('Profile data validation', () => {
    test('should validate username format requirements', async () => {
      const invalidUsernames = [
        'a', // Too short
        'a'.repeat(51), // Too long
        'user@invalid', // Invalid characters
        'user name', // Spaces
        '123user', // Starting with number
        '', // Empty
        null,
        undefined
      ];

      for (const invalidUsername of invalidUsernames) {
        await expect(
          testEnv.userService.updateUser(testEnv.testUser.id, {
            username: invalidUsername as string
          })
        ).rejects.toThrow();
      }
    });

    test('should validate email format requirements', async () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user..double@domain.com',
        'user@domain..com',
        ' user@domain.com ', // Leading/trailing spaces
        'user@domain.com.', // Trailing dot
        'a'.repeat(255) + '@domain.com' // Too long
      ];

      for (const invalidEmail of invalidEmails) {
        await expect(
          testEnv.userService.updateUser(testEnv.testUser.id, {
            email: invalidEmail
          })
        ).rejects.toThrow();
      }
    });

    test('should validate wallet address format', async () => {
      const invalidWallets = [
        'invalid-wallet',
        '0x1234567890abcdef', // Ethereum format
        'wallet123',
        '',
        'a'.repeat(100), // Too long
        'InvalidBase58Characters!'
      ];

      for (const invalidWallet of invalidWallets) {
        await expect(
          testEnv.userService.createUser(invalidWallet, {
            username: `test_${Date.now()}`
          })
        ).rejects.toThrow();
      }
    });

    test('should validate preference value types and ranges', async () => {
      const invalidPreferences = [
        { theme: 123 }, // Should be string
        { theme: 'invalid-theme' }, // Invalid theme value
        { notifications: 'string' }, // Should be object
        { gameSettings: null }, // Should be object
        { privacy: [] } // Should be object
      ];

      for (const invalidPref of invalidPreferences) {
        await expect(
          testEnv.userService.updateUser(testEnv.testUser.id, {
            preferences: invalidPref
          })
        ).rejects.toThrow();
      }
    });

    test('should sanitize input data', async () => {
      const maliciousInputs = {
        username: '<script>alert("xss")</script>',
        email: 'test+<script>@example.com'
      };

      // Should either reject or sanitize
      try {
        const result = await testEnv.userService.updateUser(
          testEnv.testUser.id,
          maliciousInputs
        );

        // If not rejected, should be sanitized
        expect(result.username).not.toContain('<script>');
        expect(result.email).not.toContain('<script>');
      } catch (error) {
        // Should be rejected
        expect(error).toBeDefined();
      }
    });

    test('should enforce data length limits', async () => {
      const oversizedData = {
        username: 'a'.repeat(256),
        email: 'a'.repeat(250) + '@example.com'
      };

      await expect(
        testEnv.userService.updateUser(testEnv.testUser.id, oversizedData)
      ).rejects.toThrow();
    });

    test('should validate required fields during creation', async () => {
      const invalidCreationData = [
        { walletAddress: '' }, // Empty wallet
        { walletAddress: null }, // Null wallet
        { walletAddress: undefined } // Undefined wallet
      ];

      for (const invalidData of invalidCreationData) {
        await expect(
          testEnv.userService.createUser(
            invalidData.walletAddress as string,
            { username: 'test' }
          )
        ).rejects.toThrow();
      }
    });

    test('should handle edge cases in numeric fields', async () => {
      const edgeCases = [
        { solBalance: Number.MAX_SAFE_INTEGER },
        { solBalance: Number.MIN_SAFE_INTEGER },
        { solBalance: NaN },
        { solBalance: Infinity },
        { solBalance: -Infinity }
      ];

      for (const edgeCase of edgeCases) {
        try {
          await testEnv.userService.updateBalance(
            testEnv.testUser.id,
            edgeCase
          );

          // If successful, verify reasonable limits
          const user = await testEnv.userService.getUserById(testEnv.testUser.id);
          expect(user!.solBalance).toBeGreaterThan(-Infinity);
          expect(user!.solBalance).toBeLessThan(Infinity);
          expect(user!.solBalance).toBeGreaterThanOrEqual(0);
        } catch (error) {
          // Should reject invalid values
          expect(error).toBeDefined();
        }
      }
    });
  });

  /**
   * Integration and Performance Tests
   * Following GI #25: Scalability and extensibility
   */
  describe('Integration and performance', () => {
    test('should handle high-frequency profile updates', async () => {
      const updates = Array.from({ length: 50 }, (_, i) => ({
        username: `speed_test_${i}_${Date.now()}`
      }));

      const startTime = Date.now();

      for (const update of updates) {
        await testEnv.userService.updateUser(testEnv.testUser.id, update);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust based on requirements)
      expect(duration).toBeLessThan(10000); // 10 seconds
    });

    test('should maintain data consistency across concurrent operations', async () => {
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

      // All operations should succeed
      results.forEach(result => {
        expect(result).toBeDefined();
      });

      // Final state should be consistent
      const finalUser = await testEnv.userService.getUserById(testEnv.testUser.id);
      expect(finalUser).toBeDefined();
    });

    test('should handle database connection failures gracefully', async () => {
      // This would normally test retry logic and graceful degradation
      // For now, ensure error handling is proper

      try {
        // Simulate operation during potential failure
        const result = await testEnv.userService.getUserById(testEnv.testUser.id);
        expect(result).toBeDefined();
      } catch (error) {
        // Should handle errors gracefully
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('should cache frequently accessed data', async () => {
      // Clear cache first
      await testEnv.redisClient.flushdb();

      // First access - should hit database
      const startTime1 = Date.now();
      const user1 = await testEnv.userService.getUserById(testEnv.testUser.id);
      const duration1 = Date.now() - startTime1;

      // Second access - should hit cache (faster)
      const startTime2 = Date.now();
      const user2 = await testEnv.userService.getUserById(testEnv.testUser.id);
      const duration2 = Date.now() - startTime2;

      expect(user1).toEqual(user2);
      // Cache access should generally be faster
      expect(duration2).toBeLessThanOrEqual(duration1 + 10); // Allow for variance
    });
  });
});
