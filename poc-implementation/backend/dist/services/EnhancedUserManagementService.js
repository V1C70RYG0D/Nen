"use strict";
/**
 * Enhanced User Management Service for Nen Platform
 *
 * This service extends the existing UserService with additional features like
 * user profiles, achievements, social connections, subscriptions, blocking,
 * reporting, and advanced user analytics.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedUserManagementService = void 0;
const uuid_1 = require("uuid");
const ServiceInterfaces_1 = require("../interfaces/ServiceInterfaces");
class EnhancedUserManagementService {
    constructor(config, userService) {
        this.profiles = new Map();
        this.achievements = new Map();
        this.socialConnections = new Map();
        this.subscriptions = new Map();
        this.blocks = new Map();
        this.reports = new Map();
        // Achievement definitions
        this.availableAchievements = new Map();
        this.config = config;
        this.userService = userService;
        this.logger = config.logger.child({ service: 'EnhancedUserManagementService' });
        this.logger.info('EnhancedUserManagementService initialized', {
            environment: config.environment,
            cachingEnabled: config.enableCaching,
            metricsEnabled: config.enableMetrics
        });
        this.initializeAchievements();
        this.startBackgroundTasks();
    }
    /**
     * Create a new user with enhanced profile
     */
    async createUser(userData) {
        try {
            this.logger.info('Creating enhanced user', {
                username: userData.username,
                wallet: userData.wallet
            });
            // Create base user using existing service
            const baseUserResult = await this.userService.createUser(userData.wallet, userData);
            if (!baseUserResult) {
                throw new ServiceInterfaces_1.ServiceError('USER_CREATION_FAILED', 'Failed to create base user');
            }
            const user = baseUserResult;
            // Create enhanced profile
            const profile = {
                ...user,
                socialConnections: [],
                achievements: [],
                subscriptions: []
            };
            this.profiles.set(user.id, profile);
            this.achievements.set(user.id, []);
            this.socialConnections.set(user.id, []);
            this.subscriptions.set(user.id, []);
            this.blocks.set(user.id, []);
            // Award welcome achievement
            await this.awardAchievement(user.id, 'welcome');
            this.logger.info('Enhanced user created successfully', {
                userId: user.id,
                username: user.username
            });
            return {
                success: true,
                data: user,
                timestamp: new Date()
            };
        }
        catch (error) {
            this.logger.error('Failed to create enhanced user', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: error instanceof ServiceInterfaces_1.ServiceError ? error.message : 'Failed to create user',
                code: error instanceof ServiceInterfaces_1.ServiceError ? error.code : 'USER_CREATE_ERROR',
                timestamp: new Date()
            };
        }
    }
    /**
     * Get user by ID
     */
    async getUserById(userId) {
        try {
            const user = await this.userService.getUserById(userId);
            return {
                success: true,
                data: user,
                timestamp: new Date()
            };
        }
        catch (error) {
            this.logger.error('Failed to get user by ID', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: 'Failed to get user',
                code: 'USER_GET_ERROR',
                timestamp: new Date()
            };
        }
    }
    /**
     * Get user by wallet
     */
    async getUserByWallet(wallet) {
        try {
            const user = await this.userService.getUserByWallet(wallet);
            return {
                success: true,
                data: user,
                timestamp: new Date()
            };
        }
        catch (error) {
            this.logger.error('Failed to get user by wallet', {
                wallet,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: 'Failed to get user',
                code: 'USER_GET_ERROR',
                timestamp: new Date()
            };
        }
    }
    /**
     * Update user with enhanced features
     */
    async updateUser(userId, updates) {
        try {
            this.logger.info('Updating enhanced user', { userId });
            const updatedUser = await this.userService.updateUser(userId, updates);
            if (!updatedUser) {
                throw new ServiceInterfaces_1.ServiceError('USER_NOT_FOUND', 'User not found');
            }
            // Update profile if it exists
            const profile = this.profiles.get(userId);
            if (profile) {
                const updatedProfile = {
                    ...profile,
                    ...updates,
                    updatedAt: new Date()
                };
                this.profiles.set(userId, updatedProfile);
            }
            return {
                success: true,
                data: updatedUser,
                timestamp: new Date()
            };
        }
        catch (error) {
            this.logger.error('Failed to update user', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: error instanceof ServiceInterfaces_1.ServiceError ? error.message : 'Failed to update user',
                code: error instanceof ServiceInterfaces_1.ServiceError ? error.code : 'USER_UPDATE_ERROR',
                timestamp: new Date()
            };
        }
    }
    /**
     * Delete user (soft delete)
     */
    async deleteUser(userId) {
        try {
            this.logger.info('Deleting user', { userId });
            const user = await this.userService.getUserById(userId);
            if (!user) {
                throw new ServiceInterfaces_1.ServiceError('USER_NOT_FOUND', 'User not found');
            }
            // Mark user as inactive
            await this.userService.updateUser(userId, { isActive: false });
            // Clean up user data
            this.profiles.delete(userId);
            this.achievements.delete(userId);
            this.socialConnections.delete(userId);
            this.subscriptions.delete(userId);
            this.blocks.delete(userId);
            this.logger.info('User deleted successfully', { userId });
            return {
                success: true,
                timestamp: new Date()
            };
        }
        catch (error) {
            this.logger.error('Failed to delete user', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: error instanceof ServiceInterfaces_1.ServiceError ? error.message : 'Failed to delete user',
                code: error instanceof ServiceInterfaces_1.ServiceError ? error.code : 'USER_DELETE_ERROR',
                timestamp: new Date()
            };
        }
    }
    /**
     * Search users with advanced filters
     */
    async searchUsers(query, filters) {
        try {
            this.logger.debug('Searching users', { query, filters });
            // Get all users and apply filters
            const allProfiles = Array.from(this.profiles.values());
            let filteredUsers = allProfiles.filter(profile => {
                // Text search in username and wallet
                const matchesQuery = !query ||
                    profile.username.toLowerCase().includes(query.toLowerCase()) ||
                    profile.wallet.toLowerCase().includes(query.toLowerCase());
                if (!matchesQuery)
                    return false;
                // Apply filters
                if (filters) {
                    if (filters.role && profile.role !== filters.role)
                        return false;
                    if (filters.isActive !== undefined && profile.isActive !== filters.isActive)
                        return false;
                    if (filters.minEloRating && profile.stats.eloRating < filters.minEloRating)
                        return false;
                    if (filters.maxEloRating && profile.stats.eloRating > filters.maxEloRating)
                        return false;
                    if (filters.registeredAfter && profile.createdAt < filters.registeredAfter)
                        return false;
                    if (filters.registeredBefore && profile.createdAt > filters.registeredBefore)
                        return false;
                }
                return true;
            });
            // Sort by ELO rating (highest first)
            filteredUsers.sort((a, b) => b.stats.eloRating - a.stats.eloRating);
            const paginatedResponse = {
                items: filteredUsers,
                total: filteredUsers.length,
                page: 1,
                pageSize: filteredUsers.length,
                hasNextPage: false,
                hasPreviousPage: false
            };
            return {
                success: true,
                data: paginatedResponse,
                timestamp: new Date()
            };
        }
        catch (error) {
            this.logger.error('Failed to search users', {
                query,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: 'Failed to search users',
                code: 'USER_SEARCH_ERROR',
                timestamp: new Date()
            };
        }
    }
    /**
     * Get user statistics
     */
    async getUserStats(userId) {
        try {
            const user = await this.userService.getUserById(userId);
            if (!user) {
                throw new ServiceInterfaces_1.ServiceError('USER_NOT_FOUND', 'User not found');
            }
            const stats = await this.userService.getUserStats(userId);
            return {
                success: true,
                data: user.stats || stats,
                timestamp: new Date()
            };
        }
        catch (error) {
            this.logger.error('Failed to get user stats', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: error instanceof ServiceInterfaces_1.ServiceError ? error.message : 'Failed to get user stats',
                code: error instanceof ServiceInterfaces_1.ServiceError ? error.code : 'USER_STATS_ERROR',
                timestamp: new Date()
            };
        }
    }
    /**
     * Update user statistics
     */
    async updateUserStats(userId, updates) {
        try {
            // Update user stats using existing service
            await this.userService.updateBalance(userId, updates);
            // Check for achievements based on stat updates
            await this.checkAndAwardAchievements(userId, updates);
            return {
                success: true,
                timestamp: new Date()
            };
        }
        catch (error) {
            this.logger.error('Failed to update user stats', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: 'Failed to update user stats',
                code: 'USER_STATS_UPDATE_ERROR',
                timestamp: new Date()
            };
        }
    }
    /**
     * Get full user profile with all enhancements
     */
    async getUserProfile(userId) {
        try {
            const profile = this.profiles.get(userId);
            if (!profile) {
                throw new ServiceInterfaces_1.ServiceError('PROFILE_NOT_FOUND', 'User profile not found');
            }
            // Populate achievements, social connections, and subscriptions
            const achievements = this.achievements.get(userId) || [];
            const socialConnections = this.socialConnections.get(userId) || [];
            const subscriptions = this.subscriptions.get(userId) || [];
            const fullProfile = {
                ...profile,
                achievements,
                socialConnections,
                subscriptions
            };
            return {
                success: true,
                data: fullProfile,
                timestamp: new Date()
            };
        }
        catch (error) {
            this.logger.error('Failed to get user profile', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: error instanceof ServiceInterfaces_1.ServiceError ? error.message : 'Failed to get user profile',
                code: error instanceof ServiceInterfaces_1.ServiceError ? error.code : 'PROFILE_GET_ERROR',
                timestamp: new Date()
            };
        }
    }
    /**
     * Block a user
     */
    async blockUser(userId, blockedUserId) {
        try {
            this.logger.info('Blocking user', { userId, blockedUserId });
            if (userId === blockedUserId) {
                throw new ServiceInterfaces_1.ServiceError('INVALID_OPERATION', 'Cannot block yourself');
            }
            const blockedUser = await this.userService.getUserById(blockedUserId);
            if (!blockedUser) {
                throw new ServiceInterfaces_1.ServiceError('USER_NOT_FOUND', 'User to block not found');
            }
            const userBlocks = this.blocks.get(userId) || [];
            // Check if already blocked
            const existingBlock = userBlocks.find(block => block.blockedUserId === blockedUserId);
            if (existingBlock) {
                throw new ServiceInterfaces_1.ServiceError('ALREADY_BLOCKED', 'User is already blocked');
            }
            const blockRecord = {
                id: (0, uuid_1.v4)(),
                blockerId: userId,
                blockedUserId,
                createdAt: new Date()
            };
            userBlocks.push(blockRecord);
            this.blocks.set(userId, userBlocks);
            this.logger.info('User blocked successfully', { userId, blockedUserId });
            return {
                success: true,
                timestamp: new Date()
            };
        }
        catch (error) {
            this.logger.error('Failed to block user', {
                userId,
                blockedUserId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: error instanceof ServiceInterfaces_1.ServiceError ? error.message : 'Failed to block user',
                code: error instanceof ServiceInterfaces_1.ServiceError ? error.code : 'BLOCK_USER_ERROR',
                timestamp: new Date()
            };
        }
    }
    /**
     * Unblock a user
     */
    async unblockUser(userId, unblockedUserId) {
        try {
            this.logger.info('Unblocking user', { userId, unblockedUserId });
            const userBlocks = this.blocks.get(userId) || [];
            const blockIndex = userBlocks.findIndex(block => block.blockedUserId === unblockedUserId);
            if (blockIndex === -1) {
                throw new ServiceInterfaces_1.ServiceError('NOT_BLOCKED', 'User is not blocked');
            }
            userBlocks.splice(blockIndex, 1);
            this.blocks.set(userId, userBlocks);
            this.logger.info('User unblocked successfully', { userId, unblockedUserId });
            return {
                success: true,
                timestamp: new Date()
            };
        }
        catch (error) {
            this.logger.error('Failed to unblock user', {
                userId,
                unblockedUserId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: error instanceof ServiceInterfaces_1.ServiceError ? error.message : 'Failed to unblock user',
                code: error instanceof ServiceInterfaces_1.ServiceError ? error.code : 'UNBLOCK_USER_ERROR',
                timestamp: new Date()
            };
        }
    }
    /**
     * Report a user
     */
    async reportUser(reporterId, reportedUserId, reason) {
        try {
            this.logger.info('Reporting user', { reporterId, reportedUserId, reason });
            if (reporterId === reportedUserId) {
                throw new ServiceInterfaces_1.ServiceError('INVALID_OPERATION', 'Cannot report yourself');
            }
            const reportedUser = await this.userService.getUserById(reportedUserId);
            if (!reportedUser) {
                throw new ServiceInterfaces_1.ServiceError('USER_NOT_FOUND', 'Reported user not found');
            }
            const reportId = (0, uuid_1.v4)();
            const report = {
                id: reportId,
                reporterId,
                reportedUserId,
                reason,
                status: 'pending',
                createdAt: new Date()
            };
            this.reports.set(reportId, report);
            this.logger.info('User reported successfully', { reportId, reporterId, reportedUserId });
            return {
                success: true,
                timestamp: new Date()
            };
        }
        catch (error) {
            this.logger.error('Failed to report user', {
                reporterId,
                reportedUserId,
                reason,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: error instanceof ServiceInterfaces_1.ServiceError ? error.message : 'Failed to report user',
                code: error instanceof ServiceInterfaces_1.ServiceError ? error.code : 'REPORT_USER_ERROR',
                timestamp: new Date()
            };
        }
    }
    /**
     * Get leaderboard
     */
    async getLeaderboard(criteria, limit) {
        try {
            const leaderboard = await this.userService.getLeaderboard(limit || 20);
            // Convert to our format
            const users = leaderboard.map(entry => entry.user);
            const paginatedResponse = {
                items: users,
                total: users.length,
                page: 1,
                pageSize: users.length,
                hasNextPage: false,
                hasPreviousPage: false
            };
            return {
                success: true,
                data: paginatedResponse,
                timestamp: new Date()
            };
        }
        catch (error) {
            this.logger.error('Failed to get leaderboard', {
                criteria,
                limit,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: 'Failed to get leaderboard',
                code: 'LEADERBOARD_ERROR',
                timestamp: new Date()
            };
        }
    }
    /**
     * Add social connection
     */
    async addSocialConnection(userId, platform, username) {
        try {
            this.logger.info('Adding social connection', { userId, platform, username });
            const user = await this.userService.getUserById(userId);
            if (!user) {
                throw new ServiceInterfaces_1.ServiceError('USER_NOT_FOUND', 'User not found');
            }
            const connections = this.socialConnections.get(userId) || [];
            // Check if connection already exists for this platform
            const existingConnection = connections.find(conn => conn.platform === platform);
            if (existingConnection) {
                throw new ServiceInterfaces_1.ServiceError('CONNECTION_EXISTS', 'Social connection already exists for this platform');
            }
            const connection = {
                id: (0, uuid_1.v4)(),
                platform: platform,
                username,
                isVerified: false, // Would be verified through external API
                connectedAt: new Date()
            };
            connections.push(connection);
            this.socialConnections.set(userId, connections);
            // Award social connection achievement
            await this.awardAchievement(userId, 'social_connector');
            return {
                success: true,
                data: connection,
                timestamp: new Date()
            };
        }
        catch (error) {
            this.logger.error('Failed to add social connection', {
                userId,
                platform,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: error instanceof ServiceInterfaces_1.ServiceError ? error.message : 'Failed to add social connection',
                code: error instanceof ServiceInterfaces_1.ServiceError ? error.code : 'SOCIAL_CONNECTION_ERROR',
                timestamp: new Date()
            };
        }
    }
    /**
     * Award achievement to user
     */
    async awardAchievement(userId, achievementType) {
        try {
            const achievementTemplate = this.availableAchievements.get(achievementType);
            if (!achievementTemplate) {
                return false;
            }
            const userAchievements = this.achievements.get(userId) || [];
            // Check if user already has this achievement
            const hasAchievement = userAchievements.some(achievement => achievement.title === achievementTemplate.title);
            if (hasAchievement) {
                return false;
            }
            const achievement = {
                id: (0, uuid_1.v4)(),
                ...achievementTemplate,
                unlockedAt: new Date()
            };
            userAchievements.push(achievement);
            this.achievements.set(userId, userAchievements);
            this.logger.info('Achievement awarded', { userId, achievementType });
            return true;
        }
        catch (error) {
            this.logger.error('Failed to award achievement', {
                userId,
                achievementType,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }
    // Private helper methods
    async checkAndAwardAchievements(userId, statUpdates) {
        const user = await this.userService.getUserById(userId);
        if (!user)
            return;
        // Check various achievement conditions
        if (statUpdates.totalGamesPlayed && user.stats.totalGamesPlayed >= 10) {
            await this.awardAchievement(userId, 'game_veteran');
        }
        if (statUpdates.totalGamesWon && user.stats.totalGamesWon >= 100) {
            await this.awardAchievement(userId, 'centurion');
        }
        if (statUpdates.winStreak && user.stats.winStreak >= 5) {
            await this.awardAchievement(userId, 'streak_master');
        }
        if (statUpdates.totalWinnings && user.stats.totalWinnings >= 1000000) { // 1M lamports
            await this.awardAchievement(userId, 'high_roller');
        }
    }
    initializeAchievements() {
        // Define available achievements
        this.availableAchievements.set('welcome', {
            title: 'Welcome to Nen',
            description: 'Welcome to the Nen Platform!',
            icon: '👋',
            rarity: 'common',
            points: 10
        });
        this.availableAchievements.set('social_connector', {
            title: 'Social Butterfly',
            description: 'Connected your first social account',
            icon: '🦋',
            rarity: 'common',
            points: 25
        });
        this.availableAchievements.set('game_veteran', {
            title: 'Game Veteran',
            description: 'Played 10 games',
            icon: '🎮',
            rarity: 'common',
            points: 50
        });
        this.availableAchievements.set('centurion', {
            title: 'Centurion',
            description: 'Won 100 games',
            icon: '🏆',
            rarity: 'rare',
            points: 500
        });
        this.availableAchievements.set('streak_master', {
            title: 'Streak Master',
            description: 'Won 5 games in a row',
            icon: '🔥',
            rarity: 'epic',
            points: 200
        });
        this.availableAchievements.set('high_roller', {
            title: 'High Roller',
            description: 'Earned over 1M lamports',
            icon: '💰',
            rarity: 'legendary',
            points: 1000
        });
    }
    startBackgroundTasks() {
        // Clean up old reports every day
        setInterval(() => {
            this.cleanupOldReports();
        }, 24 * 60 * 60 * 1000);
        // Update user activity metrics every hour
        setInterval(() => {
            this.updateActivityMetrics();
        }, 60 * 60 * 1000);
    }
    cleanupOldReports() {
        try {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            let cleanedCount = 0;
            for (const [reportId, report] of this.reports.entries()) {
                if (report.status === 'resolved' && report.createdAt < thirtyDaysAgo) {
                    this.reports.delete(reportId);
                    cleanedCount++;
                }
            }
            if (cleanedCount > 0) {
                this.logger.info('Cleaned up old reports', { cleanedCount });
            }
        }
        catch (error) {
            this.logger.error('Failed to cleanup old reports', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    updateActivityMetrics() {
        try {
            // Mock activity metrics update
            const now = new Date();
            let updatedCount = 0;
            for (const [userId, profile] of this.profiles.entries()) {
                // Update last seen if recently active
                if (Math.random() > 0.7) { // Mock 30% of users being active
                    profile.lastLoginAt = now;
                    this.profiles.set(userId, profile);
                    updatedCount++;
                }
            }
            this.logger.debug('Updated activity metrics', { updatedCount });
        }
        catch (error) {
            this.logger.error('Failed to update activity metrics', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
exports.EnhancedUserManagementService = EnhancedUserManagementService;
//# sourceMappingURL=EnhancedUserManagementService.js.map