"use strict";
/**
 * API Gateway Middleware
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiGateway = exports.requestId = exports.responseTimeTracking = exports.corsMiddleware = exports.requestValidation = exports.apiVersioning = exports.securityHeaders = exports.createSlowDown = exports.createRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_slow_down_1 = __importDefault(require("express-slow-down"));
const helmet_1 = __importDefault(require("helmet"));
const config_1 = require("../config");
// Rate limiting configuration
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
    return (0, express_rate_limit_1.default)({
        windowMs,
        max,
        message: {
            error: 'Too Many Requests',
            message: 'You have exceeded the rate limit. Please try again later.',
            retryAfter: Math.ceil(windowMs / 1000),
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                error: 'Too Many Requests',
                message: 'Rate limit exceeded',
                retryAfter: Math.ceil(windowMs / 1000),
            });
        },
    });
};
exports.createRateLimiter = createRateLimiter;
// Slow down middleware for progressive delays
const createSlowDown = (windowMs = 15 * 60 * 1000, delayAfter = 50) => {
    return (0, express_slow_down_1.default)({
        windowMs,
        delayAfter,
        delayMs: 500, // 500ms delay after delayAfter requests
        maxDelayMs: 20000, // Maximum delay of 20 seconds
    });
};
exports.createSlowDown = createSlowDown;
// Security headers middleware
exports.securityHeaders = (0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-eval'"], // Allow eval for Socket.IO
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", config_1.config.security.corsOrigin],
            mediaSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
});
// API versioning middleware
const apiVersioning = (req, res, next) => {
    const acceptVersion = req.headers['accept-version'] || req.headers['api-version'];
    const urlVersion = req.url.match(/^\/api\/v(\d+)\//);
    if (urlVersion) {
        req.headers['api-version'] = urlVersion[1];
    }
    else if (acceptVersion) {
        req.headers['api-version'] = acceptVersion;
    }
    else {
        req.headers['api-version'] = '1'; // Default version
    }
    next();
};
exports.apiVersioning = apiVersioning;
// Request validation middleware
const requestValidation = (req, res, next) => {
    // Validate content type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.includes('application/json')) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Content-Type must be application/json',
            });
        }
    }
    // Validate request size
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > 10 * 1024 * 1024) { // 10MB limit
        return res.status(413).json({
            error: 'Payload Too Large',
            message: 'Request payload exceeds maximum size limit',
        });
    }
    next();
};
exports.requestValidation = requestValidation;
// CORS middleware with dynamic origin validation
const corsMiddleware = (req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = config_1.config.security.corsOrigin.split(',');
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        res.header('Access-Control-Allow-Origin', origin || '*');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, API-Version');
    res.header('Access-Control-Allow-Credentials', config_1.config.security.corsCredentials.toString());
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
};
exports.corsMiddleware = corsMiddleware;
// Response time tracking
const responseTimeTracking = (req, res, next) => {
    const startTime = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        res.setHeader('X-Response-Time', `${duration}ms`);
        // Log slow requests
        if (duration > 1000) {
            console.warn(`Slow request: ${req.method} ${req.url} took ${duration}ms`);
        }
    });
    next();
};
exports.responseTimeTracking = responseTimeTracking;
// Request ID middleware for tracing
const requestId = (req, res, next) => {
    const requestId = req.headers['x-request-id'] ||
        req.headers['x-correlation-id'] ||
        `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
};
exports.requestId = requestId;
// API Gateway middleware stack
exports.apiGateway = [
    exports.securityHeaders,
    exports.corsMiddleware,
    exports.requestId,
    exports.responseTimeTracking,
    exports.apiVersioning,
    exports.requestValidation,
    (0, exports.createRateLimiter)(config_1.config.security.rateLimitWindowMs, config_1.config.security.rateLimitMaxRequests),
    (0, exports.createSlowDown)(),
];
exports.default = exports.apiGateway;
//# sourceMappingURL=apiGateway.js.map