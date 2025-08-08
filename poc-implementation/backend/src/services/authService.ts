import jwt from 'jsonwebtoken';
import { PublicKey } from '@solana/web3.js';
import { createError } from '../middleware/errorHandler.js';

export interface User {
  id: string;
  publicKey: string;
  address: string;
  wallet: string;
  username?: string;
  email?: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt: Date;
  preferences?: any;
}

export interface AuthToken {
  token: string;
  refreshToken: string;
  user: User;
  expiresAt: Date;
}

export interface TokenPayload {
  userId: string;
  id: string;
  publicKey: string;
  address: string;
  wallet: string;
  username?: string;
  email?: string;
  role: string;
  iat: number;
  exp: number;
}

export class AuthenticationService {
  private jwtSecret: string;
  private refreshSecret: string;

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
  async verifyWalletSignature(
    publicKey: string,
    signature: string,
    message: string,
    timestamp?: number
  ): Promise<boolean> {
    try {
      // Validate timestamp if provided (should be within last 5 minutes)
      if (timestamp) {
        const now = Date.now();
        if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
          throw createError('Authentication request expired', 401);
        }
      }

      // Validate public key format
      const publicKeyObj = new PublicKey(publicKey);
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
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate JWT tokens for authenticated user
   */
  generateTokens(user: Partial<User>): { token: string; refreshToken: string } {
    const now = Math.floor(Date.now() / 1000);
    
    const tokenPayload: Partial<TokenPayload> = {
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

    const token = jwt.sign(tokenPayload, this.jwtSecret, { expiresIn: '24h' });
    
    const refreshPayload = {
      userId: user.id,
      type: 'refresh',
      iat: now
    };

    const refreshToken = jwt.sign(refreshPayload, this.refreshSecret, { expiresIn: '7d' });

    return { token, refreshToken };
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as TokenPayload;
      
      // Validate required fields
      if (!decoded.id && !decoded.userId) {
        return null;
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw createError('Token has expired', 401);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw createError('Invalid token', 401);
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(refreshToken: string): Promise<any> {
    try {
      const decoded = jwt.verify(refreshToken, this.refreshSecret) as any;
      
      if (decoded.type !== 'refresh') {
        throw createError('Invalid refresh token', 401);
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw createError('Refresh token has expired', 401);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw createError('Invalid refresh token', 401);
      }
      throw error;
    }
  }

  /**
   * Authenticate user with Solana wallet
   */
  async authenticateWallet(
    publicKey: string,
    signature: string,
    message: string,
    timestamp?: number
  ): Promise<{ token: string; refreshToken: string; user: User }> {
    // Verify wallet signature
    const isValidSignature = await this.verifyWalletSignature(
      publicKey,
      signature,
      message,
      timestamp
    );

    if (!isValidSignature) {
      throw createError('Invalid wallet signature', 401);
    }

    // Create user object (in production, this would query the database)
    const user: User = {
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
  async refreshAccessToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    // Verify refresh token
    const decoded = await this.verifyRefreshToken(refreshToken);

    // In production, fetch user from database using decoded.userId
    const user: Partial<User> = {
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
  async validatePermissions(
    user: TokenPayload,
    requiredPermissions: string[]
  ): Promise<boolean> {
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
    const userPermissions = rolePermissions[userRole as keyof typeof rolePermissions] || [];

    return requiredPermissions.every(permission => userPermissions.includes(permission));
  }

  /**
   * Check if user has required role
   */
  hasRole(user: TokenPayload, requiredRole: string): boolean {
    const roleHierarchy = {
      user: 1,
      moderator: 2,
      admin: 3,
      developer: 4
    };

    const userRoleLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    return userRoleLevel >= requiredRoleLevel;
  }

  /**
   * Check if user owns a resource
   */
  isResourceOwner(user: TokenPayload, resourceUserId: string): boolean {
    return user.id === resourceUserId || user.userId === resourceUserId;
  }

  /**
   * Get user context from token
   */
  async getUserContext(token: string): Promise<TokenPayload> {
    const decoded = await this.verifyToken(token);
    if (!decoded) {
      throw createError('Invalid or expired token', 401);
    }
    return decoded;
  }

  /**
   * Validate token and extract user information for middleware
   */
  async validateAuthToken(authorizationHeader?: string): Promise<TokenPayload> {
    if (!authorizationHeader) {
      throw createError('Access denied. No token provided.', 401);
    }

    const token = authorizationHeader.replace('Bearer ', '');
    if (!token) {
      throw createError('Access denied. Invalid token format.', 401);
    }

    return await this.getUserContext(token);
  }
}

// Export singleton instance
export const authService = new AuthenticationService();
