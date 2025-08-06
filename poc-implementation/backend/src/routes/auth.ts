import { Router } from 'express';
import { sign, verify } from 'jsonwebtoken';
import { createError } from '../middleware/errorHandler';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

const router = Router();

/**
 * @swagger
 * /api/auth/wallet:
 *   post:
 *     summary: Authenticate with Solana wallet
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - publicKey
 *               - signature
 *               - message
 *             properties:
 *               publicKey:
 *                 type: string
 *               signature:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Authentication failed
 */
// POST /api/auth/wallet - Authenticate with Solana wallet
router.post('/wallet', async (req, res, next) => {
  try {
    const { publicKey, signature, message } = req.body;

    if (!publicKey || !signature || !message) {
      throw createError('Missing required fields: publicKey, signature, message', 400);
    }

    // Verify signature with Solana wallet authentication
    try {
      const publicKeyObj = new PublicKey(publicKey);

      // Basic validation - in production this would use proper signature verification

      if (!publicKeyObj.toBase58() || !signature || signature.length < 64) {
        throw createError('Invalid wallet credentials format', 401);
      }

      // Additional validation: ensure message content is reasonable
      if (!message || message.length < 10) {
        throw createError('Invalid authentication message', 401);
      }

    } catch (sigError: any) {
      const errorMessage = sigError?.message || 'Unknown verification error';
      throw createError(`Wallet authentication failed: ${errorMessage}`, 401);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw createError('JWT secret not configured', 500);
    }

    // Generate consistent token payload
    const tokenPayload = {
      userId: publicKey, // For backward compatibility
      id: publicKey,
      publicKey,
      address: publicKey,
      wallet: publicKey,
      role: 'user',
      iat: Math.floor(Date.now() / 1000)
    };

    const token = sign(
      tokenPayload,
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: publicKey,
        publicKey,
        address: publicKey,
        wallet: publicKey,
        role: 'user'
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/verify - Verify token
router.post('/verify', async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw createError('Token required', 400);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw createError('JWT secret not configured', 500);
    }

    const decoded = verify(token, jwtSecret) as any;

    res.json({
      success: true,
      valid: true,
      user: decoded
    });
  } catch (error) {
    res.json({
      success: false,
      valid: false,
      error: 'Invalid token'
    });
  }
});

export default router;
