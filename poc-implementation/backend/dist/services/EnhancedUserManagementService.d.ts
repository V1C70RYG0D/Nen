/**
 * Enhanced User Management Service for Nen Platform
 *
 * This service extends the existing UserService with additional features like
 * user profiles, achievements, social connections, subscriptions, blocking,
 * reporting, and advanced user analytics.
 */
import { IUserManagementService, IUser, IUserProfile, ISocialConnection, IUserStats, IUserSearchFilters, ServiceResponse, PaginatedResponse, ServiceConfig } from '../interfaces/ServiceInterfaces';
import { UserService } from './UserService';
export declare class EnhancedUserManagementService implements IUserManagementService {
    private logger;
    private userService;
    private profiles;
    private achievements;
    private socialConnections;
    private subscriptions;
    private blocks;
    private reports;
    private config;
    private availableAchievements;
    constructor(config: ServiceConfig, userService: UserService);
    /**
     * Create a new user with enhanced profile
     */
    createUser(userData: Partial<IUser>): Promise<ServiceResponse<IUser>>;
    /**
     * Get user by ID
     */
    getUserById(userId: string): Promise<ServiceResponse<IUser | null>>;
    /**
     * Get user by wallet
     */
    getUserByWallet(wallet: string): Promise<ServiceResponse<IUser | null>>;
    /**
     * Update user with enhanced features
     */
    updateUser(userId: string, updates: Partial<IUser>): Promise<ServiceResponse<IUser>>;
    /**
     * Delete user (soft delete)
     */
    deleteUser(userId: string): Promise<ServiceResponse<void>>;
    /**
     * Search users with advanced filters
     */
    searchUsers(query: string, filters?: IUserSearchFilters): Promise<ServiceResponse<PaginatedResponse<IUser>>>;
    /**
     * Get user statistics
     */
    getUserStats(userId: string): Promise<ServiceResponse<IUserStats>>;
    /**
     * Update user statistics
     */
    updateUserStats(userId: string, updates: Partial<IUserStats>): Promise<ServiceResponse<void>>;
    /**
     * Get full user profile with all enhancements
     */
    getUserProfile(userId: string): Promise<ServiceResponse<IUserProfile>>;
    /**
     * Block a user
     */
    blockUser(userId: string, blockedUserId: string): Promise<ServiceResponse<void>>;
    /**
     * Unblock a user
     */
    unblockUser(userId: string, unblockedUserId: string): Promise<ServiceResponse<void>>;
    /**
     * Report a user
     */
    reportUser(reporterId: string, reportedUserId: string, reason: string): Promise<ServiceResponse<void>>;
    /**
     * Get leaderboard
     */
    getLeaderboard(criteria: 'elo' | 'winnings' | 'games_won', limit?: number): Promise<ServiceResponse<PaginatedResponse<IUser>>>;
    /**
     * Add social connection
     */
    addSocialConnection(userId: string, platform: string, username: string): Promise<ServiceResponse<ISocialConnection>>;
    /**
     * Award achievement to user
     */
    awardAchievement(userId: string, achievementType: string): Promise<boolean>;
    private checkAndAwardAchievements;
    private initializeAchievements;
    private startBackgroundTasks;
    private cleanupOldReports;
    private updateActivityMetrics;
}
//# sourceMappingURL=EnhancedUserManagementService.d.ts.map