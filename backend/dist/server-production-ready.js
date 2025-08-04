"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const compression_1 = __importDefault(require("compression"));
const winston_1 = __importDefault(require("winston"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const highPerformance_1 = require("./middleware/highPerformance");
const advancedErrorRecovery_1 = require("./middleware/advancedErrorRecovery");
const ai_1 = __importDefault(require("./routes/ai"));
const enhanced_1 = __importDefault(require("./routes/enhanced"));
const game_1 = __importDefault(require("./routes/game"));
const user_1 = __importDefault(require("./routes/user"));
const nft_1 = __importDefault(require("./routes/nft"));
const auth_1 = __importDefault(require("./routes/auth"));
dotenv_1.default.config();
(0, advancedErrorRecovery_1.setupGlobalErrorHandlers)();
const logsDir = path_1.default.dirname(process.env.LOG_FILE_PATH || './logs/backend.log');
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
}
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    defaultMeta: {
        service: 'nen-backend-production',
        version: process.env.npm_package_version || '1.0.0'
    },
    transports: [
        new winston_1.default.transports.File({
            filename: process.env.LOG_FILE_PATH || './logs/backend.log',
            maxsize: 50 * 1024 * 1024,
            maxFiles: 5,
            tailable: true
        }),
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        })
    ]
});
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));
app.use((0, cors_1.default)({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || (() => {
        throw new Error('ALLOWED_ORIGINS must be set in environment variables. GI-18: No hardcoded values allowed.');
    })(),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
    maxAge: 86400
}));
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: {
        error: 'Too many requests from this IP',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
const strictLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60000,
    max: 10,
    message: {
        error: 'Too many sensitive requests from this IP',
        retryAfter: '1 minute'
    }
});
app.use('/api', generalLimiter);
app.use('/api/auth', strictLimiter);
app.use('/api/betting', strictLimiter);
app.use((0, compression_1.default)({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression_1.default.filter(req, res);
    }
}));
highPerformance_1.highPerformanceStack.forEach(middleware => app.use(middleware));
app.use((0, morgan_1.default)('combined', {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));
app.use(express_1.default.json({
    limit: '10mb',
    verify: (req, res, buf) => {
        try {
            JSON.parse(buf.toString());
        }
        catch (e) {
            throw new Error('Invalid JSON payload');
        }
    }
}));
app.use(express_1.default.urlencoded({
    extended: true,
    limit: '10mb'
}));
app.use((0, highPerformance_1.smartCache)());
app.use('/api', (req, res, next) => {
    const apiKey = req.header('X-API-Key');
    const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
    if (req.path === '/health') {
        return next();
    }
    next();
});
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    next();
});
app.use('/api/v1/ai', ai_1.default);
app.use('/api/v1/enhanced', enhanced_1.default);
app.use('/api/v1/game', game_1.default);
app.use('/api/v1/user', user_1.default);
app.use('/api/v1/nft', nft_1.default);
app.use('/api/v1/auth', auth_1.default);
app.get('/health', highPerformance_1.healthCheck);
app.get('/api-docs', (req, res) => {
    res.json({
        name: 'Nen Platform API',
        version: '1.0.0',
        status: 'production',
        endpoints: {
            health: '/health',
            ai: '/api/v1/ai',
            game: '/api/v1/game',
            user: '/api/v1/user',
            nft: '/api/v1/nft',
            auth: '/api/v1/auth'
        },
        security: {
            rateLimit: '100 requests per 15 minutes',
            cors: 'Enabled with origin restrictions',
            helmet: 'Enabled with CSP',
            apiKey: 'Optional (X-API-Key header)'
        }
    });
});
app.get('/metrics', (req, res) => {
    res.json({
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        timestamp: new Date().toISOString()
    });
});
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
    });
});
app.use(advancedErrorRecovery_1.enhancedErrorHandler);
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    httpServer.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    httpServer.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});
const PORT = parseInt(process.env.PORT || process.env.BACKEND_PORT || (() => {
    throw new Error('PORT or BACKEND_PORT must be set in environment variables. GI-18: No hardcoded values allowed.');
})(), 10);
const HOST = process.env.HOST || process.env.BACKEND_HOST || (() => {
    throw new Error('HOST or BACKEND_HOST must be set in environment variables. GI-18: No hardcoded values allowed.');
})();
httpServer.listen(PORT, HOST, () => {
    logger.info(`🚀 Nen Platform Backend (Production-Ready) started`);
    logger.info(`📍 Server: http://${HOST}:${PORT}`);
    logger.info(`🏥 Health: http://${HOST}:${PORT}/health`);
    logger.info(`📚 API Docs: http://${HOST}:${PORT}/api-docs`);
    logger.info(`📊 Metrics: http://${HOST}:${PORT}/metrics`);
    logger.info(`🔒 Security: Enhanced with Helmet, CORS, Rate Limiting`);
    logger.info(`⚡ Performance: Compression, Caching, Connection Pooling`);
    logger.info(`🎯 Environment: ${process.env.NODE_ENV || 'development'}`);
});
exports.default = app;
//# sourceMappingURL=server-production-ready.js.map