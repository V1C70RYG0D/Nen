"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthenticationService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const web3_js_1 = require("@solana/web3.js");
const errorHandler_js_1 = require("../middleware/errorHandler.js");
class AuthenticationService {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || '';
        this.refreshSecret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || '';
        if (!this.jwtSecret) {
            throw new Error('JWT_SECRET environment variable is required');
        }
    }
    /**
     * Verify Solana wallet signature
     */
    async verifyWalletSignature(publicKey, signature, message, timestamp) {
        try {
            // Validate timestamp if provided (should be within last 5 minutes)
            if (timestamp) {
                const now = Date.now();
                if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
                    throw (0, errorHandler_js_1.createError)('Authentication request expired', 401);
                }
            }
            // Validate public key format
            const publicKeyObj = new web3_js_1.PublicKey(publicKey);
            if (!publicKeyObj.toBase58()) {
                return false;
            }
            // Basic validation for development
            // In production, implement actual signature verification
            if (!signature || signature.length < 64) {
                return false;
            }
            if (!message || message.length < 10) {
                return false;
            }
            // Real signature verification using tweetnacl (production-ready)
            const nacl = require('tweetnacl');
            const bs58 = require('bs58');
            const signatureBytes = bs58.decode(signature);
            if (signatureBytes.length !== 64) {
                return false;
            }
            const messageBytes = new TextEncoder().encode(message);
            const publicKeyBytes = publicKeyObj.toBytes();
            // Use the correct API: nacl.sign.detached.verify
            return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Generate JWT tokens for authenticated user
     */
    generateTokens(user) {
        const now = Math.floor(Date.now() / 1000);
        const tokenPayload = {
            userId: user.id,
            id: user.id,
            publicKey: user.publicKey,
            address: user.address || user.publicKey,
            wallet: user.wallet || user.publicKey,
            username: user.username,
            email: user.email,
            role: user.role || 'user',
            iat: now
        };
        const token = jsonwebtoken_1.default.sign(tokenPayload, this.jwtSecret, { expiresIn: '24h' });
        const refreshPayload = {
            userId: user.id,
            type: 'refresh',
            iat: now
        };
        const refreshToken = jsonwebtoken_1.default.sign(refreshPayload, this.refreshSecret, { expiresIn: '7d' });
        return { token, refreshToken };
    }
    /**
     * Verify JWT token
     */
    async verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.jwtSecret);
            // Validate required fields
            if (!decoded.id && !decoded.userId) {
                return null;
            }
            return decoded;
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw (0, errorHandler_js_1.createError)('Token has expired', 401);
            }
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw (0, errorHandler_js_1.createError)('Invalid token', 401);
            }
            throw error;
        }
    }
    /**
     * Verify refresh token
     */
    async verifyRefreshToken(refreshToken) {
        try {
            const decoded = jsonwebtoken_1.default.verify(refreshToken, this.refreshSecret);
            if (decoded.type !== 'refresh') {
                throw (0, errorHandler_js_1.createError)('Invalid refresh token', 401);
            }
            return decoded;
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw (0, errorHandler_js_1.createError)('Refresh token has expired', 401);
            }
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw (0, errorHandler_js_1.createError)('Invalid refresh token', 401);
            }
            throw error;
        }
    }
    /**
     * Authenticate user with Solana wallet
     */
    async authenticateWallet(publicKey, signature, message, timestamp) {
        // Verify wallet signature
        const isValidSignature = await this.verifyWalletSignature(publicKey, signature, message, timestamp);
        if (!isValidSignature) {
            throw (0, errorHandler_js_1.createError)('Invalid wallet signature', 401);
        }
        // Create user object (in production, this would query the database)
        const user = {
            id: publicKey,
            publicKey,
            address: publicKey,
            wallet: publicKey,
            role: 'user',
            isActive: true,
            createdAt: new Date(),
            lastLoginAt: new Date()
        };
        // Generate tokens
        const { token, refreshToken } = this.generateTokens(user);
        return {
            token,
            refreshToken,
            user
        };
    }
    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(refreshToken) {
        // Verify refresh token
        const decoded = await this.verifyRefreshToken(refreshToken);
        // In production, fetch user from database using decoded.userId
        const user = {
            id: decoded.userId,
            publicKey: decoded.userId, // Assuming userId is the public key
            address: decoded.userId,
            wallet: decoded.userId,
            role: 'user'
        };
        // Generate new tokens
        return this.generateTokens(user);
    }
    /**
     * Validate user permissions for a resource
     */
    async validatePermissions(user, requiredPermissions) {
        const rolePermissions = {
            user: [
                'read:profile',
                'update:profile',
                'read:games',
                'create:games',
                'read:bets',
                'create:bets'
            ],
            moderator: [
                'read:users',
                'moderate:games',
                'moderate:chat',
                'read:reports',
                'create:reports'
            ],
            admin: [
                'read:all',
                'update:all',
                'delete:users',
                'manage:system',
                'read:analytics'
            ],
            developer: [
                'read:all',
                'update:all',
                'delete:all',
                'manage:all',
                'debug:all'
            ]
        };
        const userRole = user.role || 'user';
        const userPermissions = rolePermissions[userRole] || [];
        return requiredPermissions.every(permission => userPermissions.includes(permission));
    }
    /**
     * Check if user has required role
     */
    hasRole(user, requiredRole) {
        const roleHierarchy = {
            user: 1,
            moderator: 2,
            admin: 3,
            developer: 4
        };
        const userRoleLevel = roleHierarchy[user.role] || 0;
        const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
        return userRoleLevel >= requiredRoleLevel;
    }
    /**
     * Check if user owns a resource
     */
    isResourceOwner(user, resourceUserId) {
        return user.id === resourceUserId || user.userId === resourceUserId;
    }
    /**
     * Get user context from token
     */
    async getUserContext(token) {
        const decoded = await this.verifyToken(token);
        if (!decoded) {
            throw (0, errorHandler_js_1.createError)('Invalid or expired token', 401);
        }
        return decoded;
    }
    /**
     * Validate token and extract user information for middleware
     */
    async validateAuthToken(authorizationHeader) {
        if (!authorizationHeader) {
            throw (0, errorHandler_js_1.createError)('Access denied. No token provided.', 401);
        }
        const token = authorizationHeader.replace('Bearer ', '');
        if (!token) {
            throw (0, errorHandler_js_1.createError)('Access denied. Invalid token format.', 401);
        }
        return await this.getUserContext(token);
    }
}
exports.AuthenticationService = AuthenticationService;
// Export singleton instance
exports.authService = new AuthenticationService();
//# sourceMappingURL=authService.js.map