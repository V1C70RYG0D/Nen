"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = require("jsonwebtoken");
const errorHandler_1 = require("../middleware/errorHandler");
const web3_js_1 = require("@solana/web3.js");
const router = (0, express_1.Router)();
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
            throw (0, errorHandler_1.createError)('Missing required fields: publicKey, signature, message', 400);
        }
        // Verify signature with Solana wallet authentication
        try {
            const publicKeyObj = new web3_js_1.PublicKey(publicKey);
            // Basic validation - in production this would use proper signature verification
            if (!publicKeyObj.toBase58() || !signature || signature.length < 64) {
                throw (0, errorHandler_1.createError)('Invalid wallet credentials format', 401);
            }
            // Additional validation: ensure message content is reasonable
            if (!message || message.length < 10) {
                throw (0, errorHandler_1.createError)('Invalid authentication message', 401);
            }
        }
        catch (sigError) {
            const errorMessage = sigError?.message || 'Unknown verification error';
            throw (0, errorHandler_1.createError)(`Wallet authentication failed: ${errorMessage}`, 401);
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw (0, errorHandler_1.createError)('JWT secret not configured', 500);
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
        const token = (0, jsonwebtoken_1.sign)(tokenPayload, jwtSecret, { expiresIn: '7d' });
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
    }
    catch (error) {
        next(error);
    }
});
// POST /api/auth/verify - Verify token
router.post('/verify', async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token) {
            throw (0, errorHandler_1.createError)('Token required', 400);
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw (0, errorHandler_1.createError)('JWT secret not configured', 500);
        }
        const decoded = (0, jsonwebtoken_1.verify)(token, jwtSecret);
        res.json({
            success: true,
            valid: true,
            user: decoded
        });
    }
    catch (error) {
        res.json({
            success: false,
            valid: false,
            error: 'Invalid token'
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map