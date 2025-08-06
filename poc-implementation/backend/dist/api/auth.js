"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const authService_js_1 = require("../services/authService.js");
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
        const { publicKey, signature, message, timestamp } = req.body;
        if (!publicKey || !signature || !message) {
            throw (0, errorHandler_1.createError)('Missing required fields: publicKey, signature, message', 400);
        }
        // Use auth service for wallet authentication
        const authResult = await authService_js_1.authService.authenticateWallet(publicKey, signature, message, timestamp);
        res.json({
            success: true,
            ...authResult
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
        // Use auth service for token verification
        const decoded = await authService_js_1.authService.verifyToken(token);
        if (!decoded) {
            return res.json({
                success: false,
                valid: false,
                error: 'Invalid token'
            });
        }
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
            error: error.message || 'Invalid token'
        });
    }
});
/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Invalid refresh token
 */
// POST /api/auth/refresh - Refresh access token
router.post('/refresh', async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            throw (0, errorHandler_1.createError)('Refresh token required', 400);
        }
        const tokens = await authService_js_1.authService.refreshAccessToken(refreshToken);
        res.json({
            success: true,
            ...tokens
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout and invalidate token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
// POST /api/auth/logout - Logout user
router.post('/logout', async (req, res, next) => {
    try {
        // In production, implement token blacklist or invalidation
        // For now, just return success
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map