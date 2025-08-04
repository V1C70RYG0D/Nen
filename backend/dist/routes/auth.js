"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = require("jsonwebtoken");
const errorHandler_1 = require("../middleware/errorHandler");
const web3_js_1 = require("@solana/web3.js");
const router = (0, express_1.Router)();
router.post('/wallet', async (req, res, next) => {
    try {
        const { publicKey, signature, message } = req.body;
        if (!publicKey || !signature || !message) {
            throw (0, errorHandler_1.createError)('Missing required fields: publicKey, signature, message', 400);
        }
        try {
            const publicKeyObj = new web3_js_1.PublicKey(publicKey);
            if (!publicKeyObj.toBase58() || !signature || signature.length < 64) {
                throw (0, errorHandler_1.createError)('Invalid wallet credentials format', 401);
            }
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
        const token = (0, jsonwebtoken_1.sign)({
            id: publicKey,
            publicKey,
            address: publicKey
        }, jwtSecret, { expiresIn: '7d' });
        res.json({
            success: true,
            token,
            user: {
                id: publicKey,
                publicKey,
                address: publicKey
            }
        });
    }
    catch (error) {
        next(error);
    }
});
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
        const decoded = (0, jsonwebtoken_1.sign)(token, jwtSecret);
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