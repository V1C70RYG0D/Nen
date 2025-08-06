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
exports.optionalAuth = exports.oauthMiddleware = exports.solanaWalletAuth = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_js_1 = require("./errorHandler.js");
const node_fetch_1 = __importDefault(require("node-fetch"));
const web3_js_1 = require("@solana/web3.js");
// Enhanced authentication middleware with proper Solana signature verification
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            throw (0, errorHandler_js_1.createError)('Access denied. No token provided.', 401);
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw (0, errorHandler_js_1.createError)('JWT secret not configured', 500);
        }
        // Verify JWT token
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        // Validate that required fields are present in the token
        // Support both old and new token formats for backward compatibility
        const userId = decoded.userId || decoded.id;
        const wallet = decoded.wallet || decoded.publicKey || decoded.address;
        if (!userId || !wallet) {
            throw (0, errorHandler_js_1.createError)('Invalid token payload', 401);
        }
        // Validate wallet address format
        try {
            new web3_js_1.PublicKey(wallet);
        }
        catch {
            throw (0, errorHandler_js_1.createError)('Invalid wallet address in token', 401);
        }
        // Set user information from token with backward compatibility
        req.user = {
            id: userId,
            publicKey: wallet,
            address: wallet,
            wallet: wallet,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role || 'user'
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next((0, errorHandler_js_1.createError)('Invalid token', 401));
        }
        else {
            next(error);
        }
    }
};
exports.authMiddleware = authMiddleware;
// Enhanced Solana wallet authentication middleware
const solanaWalletAuth = async (req, res, next) => {
    try {
        const { publicKey, signature, message, timestamp } = req.body;
        if (!publicKey || !signature || !message) {
            throw (0, errorHandler_js_1.createError)('Missing required wallet authentication fields', 400);
        }
        // Validate timestamp (should be within last 5 minutes)
        if (timestamp) {
            const now = Date.now();
            if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
                throw (0, errorHandler_js_1.createError)('Authentication request expired', 401);
            }
        }
        // Validate public key format
        try {
            new web3_js_1.PublicKey(publicKey);
        }
        catch {
            throw (0, errorHandler_js_1.createError)('Invalid Solana public key format', 400);
        }
        // Import signature verification libraries
        const nacl = await Promise.resolve().then(() => __importStar(require('tweetnacl')));
        const bs58 = await Promise.resolve().then(() => __importStar(require('bs58')));
        // Decode signature from base58
        let signatureBytes;
        try {
            signatureBytes = bs58.decode(signature);
        }
        catch {
            throw (0, errorHandler_js_1.createError)('Invalid signature encoding', 400);
        }
        // Validate signature length (64 bytes for ed25519)
        if (signatureBytes.length !== 64) {
            throw (0, errorHandler_js_1.createError)('Invalid signature length', 400);
        }
        // Convert message to bytes
        const messageBytes = new TextEncoder().encode(message);
        // Get public key bytes
        const publicKeyObj = new web3_js_1.PublicKey(publicKey);
        const publicKeyBytes = publicKeyObj.toBytes();
        // Verify signature
        const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
        if (!isValid) {
            throw (0, errorHandler_js_1.createError)('Invalid wallet signature', 401);
        }
        // Set verified wallet info
        req.user = {
            id: publicKey,
            publicKey,
            address: publicKey,
            wallet: publicKey
        };
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.solanaWalletAuth = solanaWalletAuth;
const oauthMiddleware = async (req, res, next) => {
    try {
        const provider = req.query.provider;
        const accessToken = req.header('Authorization')?.replace('Bearer ', '');
        if (!accessToken || !provider) {
            throw (0, errorHandler_js_1.createError)('Access denied. Missing access token or provider.', 401);
        }
        const userInfoUrl = getUserInfoUrl(provider, accessToken);
        const response = await (0, node_fetch_1.default)(userInfoUrl);
        if (!response.ok) {
            throw (0, errorHandler_js_1.createError)('Failed to fetch user info.', 401);
        }
        const userInfo = await response.json();
        req.user = mapUserInfoToUser(userInfo, provider);
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.oauthMiddleware = oauthMiddleware;
function getUserInfoUrl(provider, accessToken) {
    switch (provider) {
        case 'google':
            return `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${accessToken}`;
        case 'facebook':
            return `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`;
        default:
            throw (0, errorHandler_js_1.createError)('Unsupported OAuth provider.', 400);
    }
}
function mapUserInfoToUser(userInfo, provider) {
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
            throw (0, errorHandler_js_1.createError)('Unsupported OAuth provider.', 400);
    }
}
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (token) {
            const jwtSecret = process.env.JWT_SECRET;
            if (jwtSecret) {
                const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
                req.user = decoded;
            }
        }
        next();
    }
    catch (error) {
        // For optional auth, we continue even if token is invalid
        next();
    }
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map