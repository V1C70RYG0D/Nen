/**
 * Enhanced Authentication Service for Nen Platform POC Phase 2
 * Step 2.5: User/Auth (Days 43-45)
 *
 * Implements wallet authentication with JWT tokens and user profiles
 * Following GI.md guidelines for production-ready implementation
 */

import { PublicKey } from '@solana/web3.js';
import { Logger } from 'winston';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// Types for authentication system
interface User {
    id: string;
    wallet: string; // Primary Solana wallet
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
    totalWagered: number; // in lamports
    totalWinnings: number; // in lamports
    favoriteAIAgent?: string;
    winStreak: number;
    bestWinStreak: number;
    aiAgentsOwned: number;
    aiAgentsCreated: number;
}

enum UserRole {
    USER = 'user',
    MODERATOR = 'moderator',
    ADMIN = 'admin',
    DEVELOPER = 'developer'
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

export class AuthenticationService {
    private logger: Logger;
    private userRegistry: Map<string, User> = new Map();
    private activeTokens: Map<string, AuthToken> = new Map();
    private tokenBlacklist: Set<string> = new Set(); // Blacklisted tokens
    private failedAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();
    private jwtSecret: string;
    private refreshTokenSecret: string;
    private tokenExpiration: number = 24 * 60 * 60 * 1000; // 24 hours
    private maxFailedAttempts: number = 5;
    private lockoutDuration: number = 15 * 60 * 1000; // 15 minutes

    constructor(logger: Logger) {
        this.logger = logger;
        this.jwtSecret = process.env.JWT_SECRET || 'nen-platform-jwt-secret-dev';
        this.refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || 'nen-platform-refresh-secret-dev';

        if (!process.env.JWT_SECRET) {
            this.logger.warn('Using default JWT secret. Set JWT_SECRET environment variable for production.');
        }

        this.logger.info('Authentication Service initialized');
    }

    /**
     * Register a new user with wallet authentication
     */
    async register(request: RegistrationRequest): Promise<AuthToken> {
        try {
            this.logger.info('Registering new user', {
                wallet: request.wallet,
                username: request.username
            });

            // Validate registration request
            await this.validateRegistrationRequest(request);

            // Verify wallet signature
            const isValidSignature = await this.verifyWalletSignature(
                request.wallet,
                request.message,
                request.signature
            );

            if (!isValidSignature) {
                throw new Error('Invalid wallet signature');
            }

            // Check if wallet already exists
            const existingUser = this.getUserByWallet(request.wallet);
            if (existingUser) {
                throw new Error('Wallet already registered');
            }

            // Check if username already exists
            const existingUsername = this.getUserByUsername(request.username);
            if (existingUsername) {
                throw new Error('Username already taken');
            }

            // Create new user
            const user: User = {
                id: uuidv4(),
                wallet: request.wallet,
                username: request.username,
                email: request.email || undefined,
                preferences: this.getDefaultPreferences(),
                stats: this.getDefaultStats(),
                createdAt: new Date(),
                lastLoginAt: new Date(),
                isActive: true,
                role: UserRole.USER
            };

            // Store user
            this.userRegistry.set(user.id, user);

            // Generate tokens
            const authToken = await this.generateAuthTokens(user);

            this.logger.info('User registered successfully', {
                userId: user.id,
                wallet: user.wallet,
                username: user.username
            });

            return authToken;

        } catch (error) {
            this.logger.error('Registration failed', {
                wallet: request.wallet,
                username: request.username,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Login user with wallet authentication
     */
    async login(request: LoginRequest): Promise<AuthToken> {
        try {
            this.logger.info('User login attempt', { wallet: request.wallet });

            // Check if wallet is locked due to failed attempts
            if (this.isWalletLocked(request.wallet)) {
                const attempts = this.failedAttempts.get(request.wallet);
                const lockoutTimeRemaining = this.lockoutDuration - (Date.now() - attempts!.lastAttempt.getTime());
                throw new Error(`Wallet is temporarily locked due to too many failed attempts. Try again in ${Math.ceil(lockoutTimeRemaining / 60000)} minutes.`);
            }

            // Validate login request
            await this.validateLoginRequest(request);

            let isValidSignature = false;
            try {
                // Verify wallet signature
                isValidSignature = await this.verifyWalletSignature(
                    request.wallet,
                    request.message,
                    request.signature
                );
            } catch (error) {
                this.logger.warn('Signature verification failed during login', {
                    wallet: request.wallet.substring(0, 8) + '...',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }

            if (!isValidSignature) {
                this.recordFailedAttempt(request.wallet);
                throw new Error('Invalid wallet signature');
            }

            // Find user by wallet
            const user = this.getUserByWallet(request.wallet);
            if (!user) {
                this.recordFailedAttempt(request.wallet);
                throw new Error('User not found. Please register first.');
            }

            if (!user.isActive) {
                this.recordFailedAttempt(request.wallet);
                throw new Error('Account is deactivated');
            }

            // Clear failed attempts on successful login
            this.clearFailedAttempts(request.wallet);

            // Update last login
            user.lastLoginAt = new Date();

            // Generate tokens
            const authToken = await this.generateAuthTokens(user);

            this.logger.info('User logged in successfully', {
                userId: user.id,
                wallet: user.wallet,
                username: user.username
            });

            return authToken;

        } catch (error) {
            this.logger.error('Login failed', {
                wallet: request.wallet,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Refresh authentication token
     */
    async refreshToken(refreshToken: string): Promise<AuthToken> {
        try {
            // Find token record
            const tokenRecord = Array.from(this.activeTokens.values())
                .find(token => token.refreshToken === refreshToken);

            if (!tokenRecord) {
                throw new Error('Invalid refresh token');
            }

            // Check if token is expired
            if (new Date() > tokenRecord.expiresAt) {
                this.activeTokens.delete(tokenRecord.token);
                throw new Error('Refresh token expired');
            }

            // Generate new tokens
            const newAuthToken = await this.generateAuthTokens(tokenRecord.user);

            // Remove old token
            this.activeTokens.delete(tokenRecord.token);

            this.logger.info('Token refreshed', {
                userId: tokenRecord.user.id,
                wallet: tokenRecord.user.wallet
            });

            return newAuthToken;

        } catch (error) {
            this.logger.error('Token refresh failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Verify JWT token
     */
    async verifyToken(token: string): Promise<User | null> {
        try {
            // Check if token is blacklisted
            if (this.isTokenBlacklisted(token)) {
                this.logger.debug('Token verification failed - token is blacklisted');
                return null;
            }

            // Check if token exists in active tokens
            const tokenRecord = this.activeTokens.get(token);
            if (!tokenRecord) {
                return null;
            }

            // Check if token is expired
            if (new Date() > tokenRecord.expiresAt) {
                this.activeTokens.delete(token);
                this.tokenBlacklist.add(token); // Add expired token to blacklist
                return null;
            }

            // Verify JWT signature
            const decoded = jwt.verify(token, this.jwtSecret) as any;

            // Get user
            const user = this.userRegistry.get(decoded.userId);
            if (!user || !user.isActive) {
                return null;
            }

            return user;

        } catch (error) {
            this.logger.debug('Token verification failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return null;
        }
    }

    /**
     * Logout user
     */
    async logout(token: string): Promise<void> {
        try {
            const tokenRecord = this.activeTokens.get(token);
            if (tokenRecord) {
                this.activeTokens.delete(token);
                this.logger.info('User logged out', {
                    userId: tokenRecord.user.id,
                    wallet: tokenRecord.user.wallet
                });
            }
        } catch (error) {
            this.logger.error('Logout failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(
        userId: string,
        updates: Partial<Pick<User, 'username' | 'email' | 'avatar' | 'preferences'>>
    ): Promise<User> {
        try {
            const user = this.userRegistry.get(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Validate updates
            if (updates.username && updates.username !== user.username) {
                const existingUser = this.getUserByUsername(updates.username);
                if (existingUser && existingUser.id !== userId) {
                    throw new Error('Username already taken');
                }
            }

            // Apply updates
            if (updates.username) user.username = updates.username;
            if (updates.email !== undefined) user.email = updates.email;
            if (updates.avatar !== undefined) user.avatar = updates.avatar;
            if (updates.preferences) {
                user.preferences = { ...user.preferences, ...updates.preferences };
            }

            this.logger.info('User profile updated', {
                userId: user.id,
                updates: Object.keys(updates)
            });

            return user;

        } catch (error) {
            this.logger.error('Profile update failed', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Update user statistics
     */
    async updateUserStats(userId: string, statUpdates: Partial<UserStats>): Promise<void> {
        try {
            const user = this.userRegistry.get(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Apply stat updates
            Object.assign(user.stats, statUpdates);

            // Update calculated stats
            if (user.stats.totalGamesPlayed > 0) {
                // Win rate is calculated automatically from totalGamesWon/totalGamesPlayed
            }

            if (user.stats.totalBetsPlaced > 0) {
                // Bet win rate is calculated automatically from totalBetsWon/totalBetsPlaced
            }

            this.logger.debug('User stats updated', {
                userId: user.id,
                updates: statUpdates
            });

        } catch (error) {
            this.logger.error('Stats update failed', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Get user by ID
     */
    getUser(userId: string): User | undefined {
        return this.userRegistry.get(userId);
    }

    /**
     * Get user by wallet
     */
    getUserByWallet(wallet: string): User | undefined {
        return Array.from(this.userRegistry.values())
            .find(user => user.wallet === wallet);
    }

    /**
     * Get user by username
     */
    getUserByUsername(username: string): User | undefined {
        return Array.from(this.userRegistry.values())
            .find(user => user.username.toLowerCase() === username.toLowerCase());
    }

    /**
     * Get user statistics summary
     */
    getUserStatsSummary(userId: string): any {
        const user = this.getUser(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const winRate = user.stats.totalGamesPlayed > 0
            ? user.stats.totalGamesWon / user.stats.totalGamesPlayed
            : 0;

        const betWinRate = user.stats.totalBetsPlaced > 0
            ? user.stats.totalBetsWon / user.stats.totalBetsPlaced
            : 0;

        const netPnL = user.stats.totalWinnings - user.stats.totalWagered;

        return {
            gamesPlayed: user.stats.totalGamesPlayed,
            winRate: Math.round(winRate * 100),
            betsPlaced: user.stats.totalBetsPlaced,
            betWinRate: Math.round(betWinRate * 100),
            totalWagered: user.stats.totalWagered,
            totalWinnings: user.stats.totalWinnings,
            netPnL,
            currentStreak: user.stats.winStreak,
            bestStreak: user.stats.bestWinStreak,
            aiAgentsOwned: user.stats.aiAgentsOwned,
            aiAgentsCreated: user.stats.aiAgentsCreated
        };
    }

    // Private helper methods

    private async validateRegistrationRequest(request: RegistrationRequest): Promise<void> {
        if (!request.wallet) {
            throw new Error('Wallet address is required');
        }

        try {
            new PublicKey(request.wallet);
        } catch {
            throw new Error('Invalid wallet address');
        }

        if (!request.username || request.username.length < 3 || request.username.length > 20) {
            throw new Error('Username must be between 3 and 20 characters');
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(request.username)) {
            throw new Error('Username can only contain letters, numbers, underscores, and hyphens');
        }

        if (request.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email)) {
            throw new Error('Invalid email format');
        }

        if (!request.signature || !request.message) {
            throw new Error('Wallet signature is required');
        }

        // Check timestamp (should be within last 5 minutes)
        const now = Date.now();
        if (Math.abs(now - request.timestamp) > 5 * 60 * 1000) {
            throw new Error('Request timestamp too old');
        }
    }

    private async validateLoginRequest(request: LoginRequest): Promise<void> {
        if (!request.wallet) {
            throw new Error('Wallet address is required');
        }

        try {
            new PublicKey(request.wallet);
        } catch {
            throw new Error('Invalid wallet address');
        }

        if (!request.signature || !request.message) {
            throw new Error('Wallet signature is required');
        }

        // Check timestamp (should be within last 5 minutes)
        const now = Date.now();
        if (Math.abs(now - request.timestamp) > 5 * 60 * 1000) {
            throw new Error('Request timestamp too old');
        }
    }

    private async verifyWalletSignature(
        wallet: string,
        message: string,
        signature: string
    ): Promise<boolean> {
        try {
            // Validate inputs
            if (!wallet || !message || !signature) {
                this.logger.warn('Missing required parameters for signature verification', {
                    hasWallet: !!wallet,
                    hasMessage: !!message,
                    hasSignature: !!signature
                });
                return false;
            }

            // Validate wallet address format
            let publicKey: PublicKey;
            try {
                publicKey = new PublicKey(wallet);
            } catch (error) {
                this.logger.warn('Invalid wallet address format', { wallet });
                return false;
            }

            // Import signature verification libraries
            const nacl = await import('tweetnacl');
            const bs58 = await import('bs58');

            // Decode the signature from base58
            let signatureBytes: Uint8Array;
            try {
                signatureBytes = bs58.decode(signature);
            } catch (error) {
                this.logger.warn('Invalid signature encoding', { signature: signature.substring(0, 20) + '...' });
                return false;
            }

            // Validate signature length (should be 64 bytes for ed25519)
            if (signatureBytes.length !== 64) {
                this.logger.warn('Invalid signature length', { length: signatureBytes.length });
                return false;
            }

            // Convert message to bytes
            const messageBytes = new TextEncoder().encode(message);

            // Get public key bytes
            const publicKeyBytes = publicKey.toBytes();

            // Verify the signature using tweetnacl
            const isValid = nacl.sign.detached.verify(
                messageBytes,
                signatureBytes,
                publicKeyBytes
            );

            if (isValid) {
                this.logger.info('Signature verification successful', {
                    wallet: wallet.substring(0, 8) + '...',
                    messageLength: message.length
                });
            } else {
                this.logger.warn('Signature verification failed', {
                    wallet: wallet.substring(0, 8) + '...',
                    messageLength: message.length
                });
            }

            return isValid;

        } catch (error) {
            this.logger.error('Signature verification error', {
                wallet: wallet?.substring(0, 8) + '...',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }

    private async generateAuthTokens(user: User): Promise<AuthToken> {
        const tokenPayload = {
            userId: user.id,
            wallet: user.wallet,
            username: user.username,
            role: user.role
        };

        const token = jwt.sign(tokenPayload, this.jwtSecret, {
            expiresIn: '24h'
        });

        const refreshToken = jwt.sign(
            { userId: user.id, type: 'refresh' },
            this.refreshTokenSecret,
            { expiresIn: '7d' }
        );

        const expiresAt = new Date(Date.now() + this.tokenExpiration);

        const authToken: AuthToken = {
            token,
            refreshToken,
            expiresAt,
            user: { ...user } // Clone user object
        };

        // Store active token
        this.activeTokens.set(token, authToken);

        return authToken;
    }

    private getDefaultPreferences(): UserPreferences {
        return {
            theme: 'light',
            notifications: {
                email: true,
                inApp: true,
                betting: true,
                gameResults: true,
                aiUpdates: false
            },
            privacy: {
                showStats: true,
                showWallet: false,
                allowDirectMessages: true
            },
            gameSettings: {
                autoPlay: false,
                soundEnabled: true,
                animationsEnabled: true,
                boardTheme: 'default'
            }
        };
    }

    private getDefaultStats(): UserStats {
        return {
            totalGamesPlayed: 0,
            totalGamesWon: 0,
            totalBetsPlaced: 0,
            totalBetsWon: 0,
            totalWagered: 0,
            totalWinnings: 0,
            winStreak: 0,
            bestWinStreak: 0,
            aiAgentsOwned: 0,
            aiAgentsCreated: 0
        };
    }

    /**
     * Check if wallet is currently locked due to failed attempts
     */
    private isWalletLocked(wallet: string): boolean {
        const attempts = this.failedAttempts.get(wallet);
        if (!attempts) return false;

        if (attempts.count >= this.maxFailedAttempts) {
            const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime();
            if (timeSinceLastAttempt < this.lockoutDuration) {
                return true;
            } else {
                // Reset failed attempts after lockout period
                this.failedAttempts.delete(wallet);
                return false;
            }
        }
        return false;
    }

    /**
     * Record failed login attempt
     */
    private recordFailedAttempt(wallet: string): void {
        const existing = this.failedAttempts.get(wallet);
        if (existing) {
            existing.count++;
            existing.lastAttempt = new Date();
        } else {
            this.failedAttempts.set(wallet, {
                count: 1,
                lastAttempt: new Date()
            });
        }

        this.logger.warn('Failed login attempt recorded', {
            wallet: wallet.substring(0, 8) + '...',
            attemptCount: this.failedAttempts.get(wallet)?.count
        });
    }

    /**
     * Clear failed attempts for wallet (on successful login)
     */
    private clearFailedAttempts(wallet: string): void {
        this.failedAttempts.delete(wallet);
    }

    /**
     * Blacklist a token (for logout or security breach)
     */
    async blacklistToken(token: string): Promise<void> {
        try {
            this.tokenBlacklist.add(token);
            this.activeTokens.delete(token);

            this.logger.info('Token blacklisted', {
                tokenPrefix: token.substring(0, 20) + '...'
            });
        } catch (error) {
            this.logger.error('Failed to blacklist token', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Check if token is blacklisted
     */
    private isTokenBlacklisted(token: string): boolean {
        return this.tokenBlacklist.has(token);
    }

    /**
     * Invalidate all user sessions (security measure)
     */
    async invalidateAllUserSessions(userId: string): Promise<void> {
        try {
            const tokensToRemove: string[] = [];

            for (const [token, authToken] of this.activeTokens.entries()) {
                if (authToken.user.id === userId) {
                    tokensToRemove.push(token);
                    this.tokenBlacklist.add(token);
                }
            }

            tokensToRemove.forEach(token => this.activeTokens.delete(token));

            this.logger.info('All user sessions invalidated', {
                userId,
                sessionsInvalidated: tokensToRemove.length
            });
        } catch (error) {
            this.logger.error('Failed to invalidate user sessions', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Clean up expired tokens and old failed attempts
     */
    async cleanupExpiredData(): Promise<void> {
        try {
            const now = new Date();
            let expiredTokens = 0;
            let clearedAttempts = 0;

            // Remove expired tokens
            for (const [token, authToken] of this.activeTokens.entries()) {
                if (now > authToken.expiresAt) {
                    this.activeTokens.delete(token);
                    this.tokenBlacklist.add(token);
                    expiredTokens++;
                }
            }

            // Clear old failed attempts (older than 24 hours)
            const oldAttemptThreshold = 24 * 60 * 60 * 1000; // 24 hours
            for (const [wallet, attempts] of this.failedAttempts.entries()) {
                const timeSinceLastAttempt = now.getTime() - attempts.lastAttempt.getTime();
                if (timeSinceLastAttempt > oldAttemptThreshold) {
                    this.failedAttempts.delete(wallet);
                    clearedAttempts++;
                }
            }

            // Limit blacklist size (keep only recent entries)
            if (this.tokenBlacklist.size > 10000) {
                const blacklistArray = Array.from(this.tokenBlacklist);
                this.tokenBlacklist.clear();
                // Keep only the last 5000 entries
                blacklistArray.slice(-5000).forEach(token => this.tokenBlacklist.add(token));
            }

            this.logger.debug('Cleanup completed', {
                expiredTokens,
                clearedAttempts,
                activeTokens: this.activeTokens.size,
                blacklistedTokens: this.tokenBlacklist.size
            });
        } catch (error) {
            this.logger.error('Cleanup failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get security statistics
     */
    getSecurityStats(): any {
        return {
            activeTokens: this.activeTokens.size,
            blacklistedTokens: this.tokenBlacklist.size,
            lockedWallets: Array.from(this.failedAttempts.values())
                .filter(attempts => attempts.count >= this.maxFailedAttempts).length,
            totalFailedAttempts: Array.from(this.failedAttempts.values())
                .reduce((sum, attempts) => sum + attempts.count, 0)
        };
    }

    /**
     * Get platform statistics
     */
    getPlatformStats(): any {
        const users = Array.from(this.userRegistry.values());
        const activeUsers = users.filter(user => user.isActive);

        return {
            totalUsers: users.length,
            activeUsers: activeUsers.length,
            totalGames: users.reduce((sum, user) => sum + user.stats.totalGamesPlayed, 0),
            totalBets: users.reduce((sum, user) => sum + user.stats.totalBetsPlaced, 0),
            totalVolume: users.reduce((sum, user) => sum + user.stats.totalWagered, 0),
            activeTokens: this.activeTokens.size
        };
    }
}
