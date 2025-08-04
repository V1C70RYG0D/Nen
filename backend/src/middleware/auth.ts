import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler.js';
import fetch from 'node-fetch';
import { PublicKey } from '@solana/web3.js';

interface AuthRequest extends Request {
  user?: {
    id: string;
    publicKey: string;
    address: string;
    username?: string;
    email?: string;
    wallet?: string;
    role?: string;
  };
}

// Enhanced authentication middleware with proper Solana signature verification
export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw createError('Access denied. No token provided.', 401);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw createError('JWT secret not configured', 500);
    }

    // Verify JWT token
    const decoded = jwt.verify(token, jwtSecret) as any;

    // Validate that required fields are present in the token
    if (!decoded.userId || !decoded.wallet) {
      throw createError('Invalid token payload', 401);
    }

    // Validate wallet address format
    try {
      new PublicKey(decoded.wallet);
    } catch {
      throw createError('Invalid wallet address in token', 401);
    }

    // Set user information from token
    req.user = {
      id: decoded.userId,
      publicKey: decoded.wallet,
      address: decoded.wallet,
      wallet: decoded.wallet,
      username: decoded.username,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(createError('Invalid token', 401));
    } else {
      next(error);
    }
  }
};

// Enhanced Solana wallet authentication middleware
export const solanaWalletAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { publicKey, signature, message, timestamp } = req.body;

    if (!publicKey || !signature || !message) {
      throw createError('Missing required wallet authentication fields', 400);
    }

    // Validate timestamp (should be within last 5 minutes)
    if (timestamp) {
      const now = Date.now();
      if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
        throw createError('Authentication request expired', 401);
      }
    }

    // Validate public key format
    try {
      new PublicKey(publicKey);
    } catch {
      throw createError('Invalid Solana public key format', 400);
    }

    // Import signature verification libraries
    const nacl = await import('tweetnacl');
    const bs58 = await import('bs58');

    // Decode signature from base58
    let signatureBytes: Uint8Array;
    try {
      signatureBytes = bs58.decode(signature);
    } catch {
      throw createError('Invalid signature encoding', 400);
    }

    // Validate signature length (64 bytes for ed25519)
    if (signatureBytes.length !== 64) {
      throw createError('Invalid signature length', 400);
    }

    // Convert message to bytes
    const messageBytes = new TextEncoder().encode(message);

    // Get public key bytes
    const publicKeyObj = new PublicKey(publicKey);
    const publicKeyBytes = publicKeyObj.toBytes();

    // Verify signature
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    if (!isValid) {
      throw createError('Invalid wallet signature', 401);
    }

    // Set verified wallet info
    req.user = {
      id: publicKey,
      publicKey,
      address: publicKey,
      wallet: publicKey
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const oauthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const provider = req.query.provider;
    const accessToken = req.header('Authorization')?.replace('Bearer ', '');
    if (!accessToken || !provider) {
      throw createError('Access denied. Missing access token or provider.', 401);
    }

    const userInfoUrl = getUserInfoUrl(provider as string, accessToken);
    const response = await fetch(userInfoUrl);
    if (!response.ok) {
      throw createError('Failed to fetch user info.', 401);
    }

    const userInfo = await response.json();
    req.user = mapUserInfoToUser(userInfo, provider as string);
    next();
  } catch (error) {
    next(error);
  }
};

function getUserInfoUrl(provider: string, accessToken: string): string {
  switch (provider) {
    case 'google':
      return `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${accessToken}`;
    case 'facebook':
      return `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`;
    default:
      throw createError('Unsupported OAuth provider.', 400);
  }
}

function mapUserInfoToUser(userInfo: any, provider: string): any {
  switch (provider) {
    case 'google':
      return {
        id: userInfo.id,
        username: userInfo.name,
        email: userInfo.email,
      };
    case 'facebook':
      return {
        id: userInfo.id,
        username: userInfo.name,
        email: userInfo.email,
      };
    default:
      throw createError('Unsupported OAuth provider.', 400);
  }
}

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const jwtSecret = process.env.JWT_SECRET;
      if (jwtSecret) {
        const decoded = jwt.verify(token, jwtSecret) as any;
        req.user = decoded;
      }
    }

    next();
  } catch (error) {
    // For optional auth, we continue even if token is invalid
    next();
  }
};
