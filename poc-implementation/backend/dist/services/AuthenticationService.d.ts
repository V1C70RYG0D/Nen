/**
 * Enhanced Authentication Service for Nen Platform POC Phase 2
 * Step 2.5: User/Auth (Days 43-45)
 *
 * Implements wallet authentication with JWT tokens and user profiles
 * Following GI.md guidelines for production-ready implementation
 */
import { Logger } from 'winston';
interface User {
    id: string;
    wallet: string;
    username: string;
    email?: string | undefined;
    avatar?: string;
    preferences: UserPreferences;
    stats: UserStats;
    createdAt: Date;
    lastLoginAt: Date;
    isActive: boolean;
    role: UserRole;
}
interface UserPreferences {
    theme: 'light' | 'dark';
    notifications: {
        email: boolean;
        inApp: boolean;
        betting: boolean;
        gameResults: boolean;
        aiUpdates: boolean;
    };
    privacy: {
        showStats: boolean;
        showWallet: boolean;
        allowDirectMessages: boolean;
    };
    gameSettings: {
        autoPlay: boolean;
        soundEnabled: boolean;
        animationsEnabled: boolean;
        boardTheme: string;
    };
}
interface UserStats {
    totalGamesPlayed: number;
    totalGamesWon: number;
    totalBetsPlaced: number;
    totalBetsWon: number;
    totalWagered: number;
    totalWinnings: number;
    favoriteAIAgent?: string;
    winStreak: number;
    bestWinStreak: number;
    aiAgentsOwned: number;
    aiAgentsCreated: number;
}
declare enum UserRole {
    USER = "user",
    MODERATOR = "moderator",
    ADMIN = "admin",
    DEVELOPER = "developer"
}
interface AuthToken {
    token: string;
    refreshToken: string;
    expiresAt: Date;
    user: User;
}
interface LoginRequest {
    wallet: string;
    signature: string;
    message: string;
    timestamp: number;
}
interface RegistrationRequest {
    wallet: string;
    username: string;
    email?: string;
    signature: string;
    message: string;
    timestamp: number;
}
export declare class AuthenticationService {
    private logger;
    private userRegistry;
    private activeTokens;
    private tokenBlacklist;
    private failedAttempts;
    private jwtSecret;
    private refreshTokenSecret;
    private tokenExpiration;
    private maxFailedAttempts;
    private lockoutDuration;
    constructor(logger: Logger);
    /**
     * Register a new user with wallet authentication
     */
    register(request: RegistrationRequest): Promise<AuthToken>;
    /**
     * Login user with wallet authentication
     */
    login(request: LoginRequest): Promise<AuthToken>;
    /**
     * Refresh authentication token
     */
    refreshToken(refreshToken: string): Promise<AuthToken>;
    /**
     * Verify JWT token
     */
    verifyToken(token: string): Promise<User | null>;
    /**
     * Logout user
     */
    logout(token: string): Promise<void>;
    /**
     * Update user profile
     */
    updateProfile(userId: string, updates: Partial<Pick<User, 'username' | 'email' | 'avatar' | 'preferences'>>): Promise<User>;
    /**
     * Update user statistics
     */
    updateUserStats(userId: string, statUpdates: Partial<UserStats>): Promise<void>;
    /**
     * Get user by ID
     */
    getUser(userId: string): User | undefined;
    /**
     * Get user by wallet
     */
    getUserByWallet(wallet: string): User | undefined;
    /**
     * Get user by username
     */
    getUserByUsername(username: string): User | undefined;
    /**
     * Get user statistics summary
     */
    getUserStatsSummary(userId: string): any;
    private validateRegistrationRequest;
    private validateLoginRequest;
    private verifyWalletSignature;
    private generateAuthTokens;
    private getDefaultPreferences;
    private getDefaultStats;
    /**
     * Check if wallet is currently locked due to failed attempts
     */
    private isWalletLocked;
    /**
     * Record failed login attempt
     */
    private recordFailedAttempt;
    /**
     * Clear failed attempts for wallet (on successful login)
     */
    private clearFailedAttempts;
    /**
     * Blacklist a token (for logout or security breach)
     */
    blacklistToken(token: string): Promise<void>;
    /**
     * Check if token is blacklisted
     */
    private isTokenBlacklisted;
    /**
     * Invalidate all user sessions (security measure)
     */
    invalidateAllUserSessions(userId: string): Promise<void>;
    /**
     * Clean up expired tokens and old failed attempts
     */
    cleanupExpiredData(): Promise<void>;
    /**
     * Get security statistics
     */
    getSecurityStats(): any;
    /**
     * Get platform statistics
     */
    getPlatformStats(): any;
}
export {};
//# sourceMappingURL=AuthenticationService.d.ts.map