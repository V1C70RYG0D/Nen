"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationService = void 0;
const web3_js_1 = require("@solana/web3.js");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
var UserRole;
(function (UserRole) {
    UserRole["USER"] = "user";
    UserRole["MODERATOR"] = "moderator";
    UserRole["ADMIN"] = "admin";
    UserRole["DEVELOPER"] = "developer";
})(UserRole || (UserRole = {}));
class AuthenticationService {
    logger;
    userRegistry = new Map();
    activeTokens = new Map();
    tokenBlacklist = new Set();
    failedAttempts = new Map();
    jwtSecret;
    refreshTokenSecret;
    tokenExpiration = 24 * 60 * 60 * 1000;
    maxFailedAttempts = 5;
    lockoutDuration = 15 * 60 * 1000;
    constructor(logger) {
        this.logger = logger;
        this.jwtSecret = process.env.JWT_SECRET || 'nen-platform-jwt-secret-dev';
        this.refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || 'nen-platform-refresh-secret-dev';
        if (!process.env.JWT_SECRET) {
            this.logger.warn('Using default JWT secret. Set JWT_SECRET environment variable for production.');
        }
        this.logger.info('Authentication Service initialized');
    }
    async register(request) {
        try {
            this.logger.info('Registering new user', {
                wallet: request.wallet,
                username: request.username
            });
            await this.validateRegistrationRequest(request);
            const isValidSignature = await this.verifyWalletSignature(request.wallet, request.message, request.signature);
            if (!isValidSignature) {
                throw new Error('Invalid wallet signature');
            }
            const existingUser = this.getUserByWallet(request.wallet);
            if (existingUser) {
                throw new Error('Wallet already registered');
            }
            const existingUsername = this.getUserByUsername(request.username);
            if (existingUsername) {
                throw new Error('Username already taken');
            }
            const user = {
                id: (0, uuid_1.v4)(),
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
            this.userRegistry.set(user.id, user);
            const authToken = await this.generateAuthTokens(user);
            this.logger.info('User registered successfully', {
                userId: user.id,
                wallet: user.wallet,
                username: user.username
            });
            return authToken;
        }
        catch (error) {
            this.logger.error('Registration failed', {
                wallet: request.wallet,
                username: request.username,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async login(request) {
        try {
            this.logger.info('User login attempt', { wallet: request.wallet });
            if (this.isWalletLocked(request.wallet)) {
                const attempts = this.failedAttempts.get(request.wallet);
                const lockoutTimeRemaining = this.lockoutDuration - (Date.now() - attempts.lastAttempt.getTime());
                throw new Error(`Wallet is temporarily locked due to too many failed attempts. Try again in ${Math.ceil(lockoutTimeRemaining / 60000)} minutes.`);
            }
            await this.validateLoginRequest(request);
            let isValidSignature = false;
            try {
                isValidSignature = await this.verifyWalletSignature(request.wallet, request.message, request.signature);
            }
            catch (error) {
                this.logger.warn('Signature verification failed during login', {
                    wallet: request.wallet.substring(0, 8) + '...',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
            if (!isValidSignature) {
                this.recordFailedAttempt(request.wallet);
                throw new Error('Invalid wallet signature');
            }
            const user = this.getUserByWallet(request.wallet);
            if (!user) {
                this.recordFailedAttempt(request.wallet);
                throw new Error('User not found. Please register first.');
            }
            if (!user.isActive) {
                this.recordFailedAttempt(request.wallet);
                throw new Error('Account is deactivated');
            }
            this.clearFailedAttempts(request.wallet);
            user.lastLoginAt = new Date();
            const authToken = await this.generateAuthTokens(user);
            this.logger.info('User logged in successfully', {
                userId: user.id,
                wallet: user.wallet,
                username: user.username
            });
            return authToken;
        }
        catch (error) {
            this.logger.error('Login failed', {
                wallet: request.wallet,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async refreshToken(refreshToken) {
        try {
            const tokenRecord = Array.from(this.activeTokens.values())
                .find(token => token.refreshToken === refreshToken);
            if (!tokenRecord) {
                throw new Error('Invalid refresh token');
            }
            if (new Date() > tokenRecord.expiresAt) {
                this.activeTokens.delete(tokenRecord.token);
                throw new Error('Refresh token expired');
            }
            const newAuthToken = await this.generateAuthTokens(tokenRecord.user);
            this.activeTokens.delete(tokenRecord.token);
            this.logger.info('Token refreshed', {
                userId: tokenRecord.user.id,
                wallet: tokenRecord.user.wallet
            });
            return newAuthToken;
        }
        catch (error) {
            this.logger.error('Token refresh failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async verifyToken(token) {
        try {
            if (this.isTokenBlacklisted(token)) {
                this.logger.debug('Token verification failed - token is blacklisted');
                return null;
            }
            const tokenRecord = this.activeTokens.get(token);
            if (!tokenRecord) {
                return null;
            }
            if (new Date() > tokenRecord.expiresAt) {
                this.activeTokens.delete(token);
                this.tokenBlacklist.add(token);
                return null;
            }
            const decoded = jsonwebtoken_1.default.verify(token, this.jwtSecret);
            const user = this.userRegistry.get(decoded.userId);
            if (!user || !user.isActive) {
                return null;
            }
            return user;
        }
        catch (error) {
            this.logger.debug('Token verification failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return null;
        }
    }
    async logout(token) {
        try {
            const tokenRecord = this.activeTokens.get(token);
            if (tokenRecord) {
                this.activeTokens.delete(token);
                this.logger.info('User logged out', {
                    userId: tokenRecord.user.id,
                    wallet: tokenRecord.user.wallet
                });
            }
        }
        catch (error) {
            this.logger.error('Logout failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async updateProfile(userId, updates) {
        try {
            const user = this.userRegistry.get(userId);
            if (!user) {
                throw new Error('User not found');
            }
            if (updates.username && updates.username !== user.username) {
                const existingUser = this.getUserByUsername(updates.username);
                if (existingUser && existingUser.id !== userId) {
                    throw new Error('Username already taken');
                }
            }
            if (updates.username)
                user.username = updates.username;
            if (updates.email !== undefined)
                user.email = updates.email;
            if (updates.avatar !== undefined)
                user.avatar = updates.avatar;
            if (updates.preferences) {
                user.preferences = { ...user.preferences, ...updates.preferences };
            }
            this.logger.info('User profile updated', {
                userId: user.id,
                updates: Object.keys(updates)
            });
            return user;
        }
        catch (error) {
            this.logger.error('Profile update failed', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async updateUserStats(userId, statUpdates) {
        try {
            const user = this.userRegistry.get(userId);
            if (!user) {
                throw new Error('User not found');
            }
            Object.assign(user.stats, statUpdates);
            if (user.stats.totalGamesPlayed > 0) {
            }
            if (user.stats.totalBetsPlaced > 0) {
            }
            this.logger.debug('User stats updated', {
                userId: user.id,
                updates: statUpdates
            });
        }
        catch (error) {
            this.logger.error('Stats update failed', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    getUser(userId) {
        return this.userRegistry.get(userId);
    }
    getUserByWallet(wallet) {
        return Array.from(this.userRegistry.values())
            .find(user => user.wallet === wallet);
    }
    getUserByUsername(username) {
        return Array.from(this.userRegistry.values())
            .find(user => user.username.toLowerCase() === username.toLowerCase());
    }
    getUserStatsSummary(userId) {
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
    async validateRegistrationRequest(request) {
        if (!request.wallet) {
            throw new Error('Wallet address is required');
        }
        try {
            new web3_js_1.PublicKey(request.wallet);
        }
        catch {
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
        const now = Date.now();
        if (Math.abs(now - request.timestamp) > 5 * 60 * 1000) {
            throw new Error('Request timestamp too old');
        }
    }
    async validateLoginRequest(request) {
        if (!request.wallet) {
            throw new Error('Wallet address is required');
        }
        try {
            new web3_js_1.PublicKey(request.wallet);
        }
        catch {
            throw new Error('Invalid wallet address');
        }
        if (!request.signature || !request.message) {
            throw new Error('Wallet signature is required');
        }
        const now = Date.now();
        if (Math.abs(now - request.timestamp) > 5 * 60 * 1000) {
            throw new Error('Request timestamp too old');
        }
    }
    async verifyWalletSignature(wallet, message, signature) {
        try {
            if (!wallet || !message || !signature) {
                this.logger.warn('Missing required parameters for signature verification', {
                    hasWallet: !!wallet,
                    hasMessage: !!message,
                    hasSignature: !!signature
                });
                return false;
            }
            let publicKey;
            try {
                publicKey = new web3_js_1.PublicKey(wallet);
            }
            catch (error) {
                this.logger.warn('Invalid wallet address format', { wallet });
                return false;
            }
            const nacl = await Promise.resolve().then(() => __importStar(require('tweetnacl')));
            const bs58 = await Promise.resolve().then(() => __importStar(require('bs58')));
            let signatureBytes;
            try {
                signatureBytes = bs58.decode(signature);
            }
            catch (error) {
                this.logger.warn('Invalid signature encoding', { signature: signature.substring(0, 20) + '...' });
                return false;
            }
            if (signatureBytes.length !== 64) {
                this.logger.warn('Invalid signature length', { length: signatureBytes.length });
                return false;
            }
            const messageBytes = new TextEncoder().encode(message);
            const publicKeyBytes = publicKey.toBytes();
            const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
            if (isValid) {
                this.logger.info('Signature verification successful', {
                    wallet: wallet.substring(0, 8) + '...',
                    messageLength: message.length
                });
            }
            else {
                this.logger.warn('Signature verification failed', {
                    wallet: wallet.substring(0, 8) + '...',
                    messageLength: message.length
                });
            }
            return isValid;
        }
        catch (error) {
            this.logger.error('Signature verification error', {
                wallet: wallet?.substring(0, 8) + '...',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }
    async generateAuthTokens(user) {
        const tokenPayload = {
            userId: user.id,
            wallet: user.wallet,
            username: user.username,
            role: user.role
        };
        const token = jsonwebtoken_1.default.sign(tokenPayload, this.jwtSecret, {
            expiresIn: '24h'
        });
        const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id, type: 'refresh' }, this.refreshTokenSecret, { expiresIn: '7d' });
        const expiresAt = new Date(Date.now() + this.tokenExpiration);
        const authToken = {
            token,
            refreshToken,
            expiresAt,
            user: { ...user }
        };
        this.activeTokens.set(token, authToken);
        return authToken;
    }
    getDefaultPreferences() {
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
    getDefaultStats() {
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
    isWalletLocked(wallet) {
        const attempts = this.failedAttempts.get(wallet);
        if (!attempts)
            return false;
        if (attempts.count >= this.maxFailedAttempts) {
            const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime();
            if (timeSinceLastAttempt < this.lockoutDuration) {
                return true;
            }
            else {
                this.failedAttempts.delete(wallet);
                return false;
            }
        }
        return false;
    }
    recordFailedAttempt(wallet) {
        const existing = this.failedAttempts.get(wallet);
        if (existing) {
            existing.count++;
            existing.lastAttempt = new Date();
        }
        else {
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
    clearFailedAttempts(wallet) {
        this.failedAttempts.delete(wallet);
    }
    async blacklistToken(token) {
        try {
            this.tokenBlacklist.add(token);
            this.activeTokens.delete(token);
            this.logger.info('Token blacklisted', {
                tokenPrefix: token.substring(0, 20) + '...'
            });
        }
        catch (error) {
            this.logger.error('Failed to blacklist token', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    isTokenBlacklisted(token) {
        return this.tokenBlacklist.has(token);
    }
    async invalidateAllUserSessions(userId) {
        try {
            const tokensToRemove = [];
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
        }
        catch (error) {
            this.logger.error('Failed to invalidate user sessions', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async cleanupExpiredData() {
        try {
            const now = new Date();
            let expiredTokens = 0;
            let clearedAttempts = 0;
            for (const [token, authToken] of this.activeTokens.entries()) {
                if (now > authToken.expiresAt) {
                    this.activeTokens.delete(token);
                    this.tokenBlacklist.add(token);
                    expiredTokens++;
                }
            }
            const oldAttemptThreshold = 24 * 60 * 60 * 1000;
            for (const [wallet, attempts] of this.failedAttempts.entries()) {
                const timeSinceLastAttempt = now.getTime() - attempts.lastAttempt.getTime();
                if (timeSinceLastAttempt > oldAttemptThreshold) {
                    this.failedAttempts.delete(wallet);
                    clearedAttempts++;
                }
            }
            if (this.tokenBlacklist.size > 10000) {
                const blacklistArray = Array.from(this.tokenBlacklist);
                this.tokenBlacklist.clear();
                blacklistArray.slice(-5000).forEach(token => this.tokenBlacklist.add(token));
            }
            this.logger.debug('Cleanup completed', {
                expiredTokens,
                clearedAttempts,
                activeTokens: this.activeTokens.size,
                blacklistedTokens: this.tokenBlacklist.size
            });
        }
        catch (error) {
            this.logger.error('Cleanup failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    getSecurityStats() {
        return {
            activeTokens: this.activeTokens.size,
            blacklistedTokens: this.tokenBlacklist.size,
            lockedWallets: Array.from(this.failedAttempts.values())
                .filter(attempts => attempts.count >= this.maxFailedAttempts).length,
            totalFailedAttempts: Array.from(this.failedAttempts.values())
                .reduce((sum, attempts) => sum + attempts.count, 0)
        };
    }
    getPlatformStats() {
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
exports.AuthenticationService = AuthenticationService;
//# sourceMappingURL=AuthenticationService.js.map