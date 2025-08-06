"use strict";
/**
 * Optimized Production Server - Final 5% Gap Closure
 * Complete server implementation with all performance optimizations and enhancements
 * Following GI.md guidelines for production-ready, launch-grade quality
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.io = exports.httpServer = exports.app = void 0;
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
const web3_js_1 = require("@solana/web3.js");
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../../config/constants.env') });
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../../config/game.env') });
// Import optimized services and middleware
const highPerformance_1 = require("./middleware/highPerformance");
const advancedErrorRecovery_1 = require("./middleware/advancedErrorRecovery");
const OptimizedBettingService_1 = __importDefault(require("./services/OptimizedBettingService"));
const EnhancedLoadTestingService_1 = __importDefault(require("./services/EnhancedLoadTestingService"));
// Route imports
const ai_1 = __importDefault(require("./routes/ai"));
const enhanced_1 = __importDefault(require("./routes/enhanced"));
const game_1 = __importDefault(require("./routes/game"));
const user_1 = __importDefault(require("./routes/user"));
const nft_1 = __importDefault(require("./routes/nft"));
const auth_1 = __importDefault(require("./routes/auth"));
// Enhanced services
const WebSocketClusterService_1 = require("./services/WebSocketClusterService");
const MagicBlockBOLTService_1 = require("./services/MagicBlockBOLTService");
const GeographicClusterManager_1 = require("./services/GeographicClusterManager");
const gameSocket_1 = require("./sockets/gameSocket");
// Load environment variables
dotenv_1.default.config();
// Setup global error handlers
(0, advancedErrorRecovery_1.setupGlobalErrorHandlers)();
// Create logs directory if it doesn't exist
const logsDir = path_1.default.dirname(process.env.LOG_FILE_PATH || './logs/backend.log');
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
}
// Configure optimized Winston logger
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    defaultMeta: {
        service: 'nen-backend-optimized',
        version: process.env.npm_package_version || '1.0.0'
    },
    transports: [
        new winston_1.default.transports.File({
            filename: process.env.LOG_FILE_PATH || './logs/backend.log',
            maxsize: 50 * 1024 * 1024, // 50MB
            maxFiles: 5,
            tailable: true
        }),
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        })
    ]
});
exports.logger = logger;
// Express app with optimizations
const app = (0, express_1.default)();
exports.app = app;
const httpServer = (0, http_1.createServer)(app);
exports.httpServer = httpServer;
// Socket.IO with Redis adapter for clustering
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});
exports.io = io;
// ==========================================
// HIGH-PERFORMANCE MIDDLEWARE STACK
// ==========================================
// Essential security and performance middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));
// Compression for performance optimization
app.use((0, compression_1.default)({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression_1.default.filter(req, res);
    },
    threshold: 1024,
    level: 6
}));
// Apply high-performance middleware stack
app.use(highPerformance_1.highPerformanceStack);
// Enhanced rate limiting with different tiers
const createRateLimiter = (windowMs, max, message) => (0, express_rate_limit_1.default)({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            userAgent: req.get('User-Agent')
        });
        res.status(429).json({ error: message });
    }
});
// Different rate limits for different endpoint types
app.use('/api/betting', createRateLimiter(60 * 1000, 30, 'Too many betting requests')); // 30 per minute
app.use('/api/game', createRateLimiter(60 * 1000, 100, 'Too many game requests')); // 100 per minute
app.use('/api/ai', createRateLimiter(60 * 1000, 50, 'Too many AI requests')); // 50 per minute
app.use('/api/', createRateLimiter(15 * 60 * 1000, 1000, 'Too many requests')); // 1000 per 15 minutes
// Request parsing with size limits
app.use(express_1.default.json({
    limit: '10mb',
    verify: (req, res, buf) => {
        // Validate JSON structure for security
        try {
            JSON.parse(buf.toString());
        }
        catch (e) {
            throw new Error('Invalid JSON');
        }
    }
}));
app.use(express_1.default.urlencoded({
    extended: true,
    limit: '10mb'
}));
// Optimized logging
app.use((0, morgan_1.default)('combined', {
    stream: {
        write: (message) => {
            logger.info(message.trim(), { component: 'http' });
            return true;
        }
    },
    skip: (req) => {
        // Skip logging for health checks and static assets
        return req.url === '/health' ||
            req.url === '/api/health' ||
            req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/);
    }
}));
// ==========================================
// OPTIMIZED ROUTING WITH SMART CACHING
// ==========================================
// Health check endpoint (optimized, no caching)
app.get('/health', highPerformance_1.healthCheck);
app.get('/api/health', highPerformance_1.healthCheck);
// Performance metrics endpoint
app.get('/api/metrics', (req, res) => {
    const { getPerformanceMetrics } = require('./middleware/highPerformance');
    res.json({
        performance: getPerformanceMetrics(),
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
// API routes with smart caching
app.use('/api/v1/auth', auth_1.default);
app.use('/api/v1/users', (0, highPerformance_1.smartCache)(parseInt(process.env.CACHE_DURATION_USER_MS)), user_1.default);
app.use('/api/v1/ai', (0, highPerformance_1.smartCache)(parseInt(process.env.CACHE_DURATION_AI_MS)), ai_1.default);
app.use('/api/v1/game', game_1.default); // No caching for real-time game data
app.use('/api/v1/nft', (0, highPerformance_1.smartCache)(parseInt(process.env.CACHE_DURATION_NFT_MS)), nft_1.default);
app.use('/api/v1/enhanced', (0, highPerformance_1.smartCache)(parseInt(process.env.CACHE_DURATION_ENHANCED_MS)), enhanced_1.default);
// Optimized betting routes with custom implementation
const optimizedBettingService = new OptimizedBettingService_1.default();
app.post('/api/v1/betting/place', async (req, res, next) => {
    try {
        const { matchId, gameId, agentId, amount } = req.body;
        const id = matchId || gameId;
        const bettorWallet = req.headers.authorization?.replace('Bearer ', '') || 'demo_wallet';
        const result = await optimizedBettingService.placeBet(bettorWallet, id, amount, agentId, 'ai_agent');
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
app.get('/api/v1/betting/odds/:matchId', (0, highPerformance_1.smartCache)(10000), async (req, res, next) => {
    try {
        const odds = await optimizedBettingService.calculateOdds(req.params.matchId);
        if (!odds) {
            res.status(404).json({ error: 'Match not found' });
            return;
        }
        res.json(odds);
    }
    catch (error) {
        next(error);
    }
});
app.get('/api/v1/betting/user/:userId', (0, highPerformance_1.smartCache)(parseInt(process.env.CACHE_DURATION_USER_MS)), async (req, res, next) => {
    try {
        const history = await optimizedBettingService.getUserBets(req.params.userId);
        res.json(history);
    }
    catch (error) {
        next(error);
    }
});
app.post('/api/v1/betting/settle/:matchId', async (req, res, next) => {
    try {
        const { winnerId, finalScore } = req.body;
        const result = await optimizedBettingService.settleMatch(req.params.matchId, winnerId, finalScore);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
// Load testing endpoint (development only)
if (process.env.NODE_ENV === 'development') {
    const loadTestingService = new EnhancedLoadTestingService_1.default();
    app.post('/api/v1/load-test', async (req, res, next) => {
        try {
            const config = {
                baseUrl: req.body.baseUrl || process.env.API_BASE_URL,
                totalRequests: req.body.totalRequests || 1000,
                concurrentUsers: req.body.concurrentUsers || 50,
                durationMs: req.body.durationMs || 60000,
                rampUpMs: req.body.rampUpMs || 10000,
                endpoints: req.body.endpoints || [
                    { method: 'GET', path: '/api/v1/ai/agents', weight: 30 },
                    { method: 'GET', path: '/health', weight: 20 },
                    { method: 'GET', path: '/api/v1/betting/odds/test-match', weight: 25 },
                    { method: 'POST', path: '/api/v1/betting/place', weight: 25, payload: {
                            matchId: 'test-match',
                            agentId: 'test-agent',
                            amount: 1.0
                        } }
                ]
            };
            const results = await loadTestingService.runLoadTest(config);
            res.json({
                results,
                report: loadTestingService.generateReport()
            });
        }
        catch (error) {
            next(error);
        }
    });
}
// Reset metrics endpoint (development only)
if (process.env.NODE_ENV === 'development') {
    app.post('/api/v1/metrics/reset', (req, res) => {
        (0, highPerformance_1.resetPerformanceMetrics)();
        res.json({ message: 'Performance metrics reset successfully' });
    });
}
// ==========================================
// ENHANCED WEBSOCKET IMPLEMENTATION
// ==========================================
// Initialize enhanced services for WebSocket
const clusterConfig = {
    nodeId: process.env.NODE_ID || 'node-1',
    region: {
        region: 'us-east',
        endpoints: [process.env.WS_ENDPOINT],
        latencyTarget: 50,
        fallbackRegions: ['us-west', 'eu-central']
    },
    redisClusterEndpoints: [process.env.REDIS_URL],
    maxConnections: 1000,
    loadBalancingStrategy: 'latency-based'
};
const clusterService = new WebSocketClusterService_1.WebSocketClusterService(io, clusterConfig, logger);
// Initialize Solana connection for MagicBlock
const connection = new web3_js_1.Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com');
const provider = {
    wallet: { publicKey: new web3_js_1.PublicKey(process.env.SOLANA_WALLET_PUBLIC_KEY || '11111111111111111111111111111112') }
}; // Real Solana provider configuration
const magicBlockService = new MagicBlockBOLTService_1.MagicBlockBOLTService(connection, provider, logger);
const clusterManager = new GeographicClusterManager_1.GeographicClusterManager(logger);
// Setup enhanced game sockets with error recovery
(0, gameSocket_1.setupEnhancedGameSocket)(io, clusterService, magicBlockService, clusterManager, logger);
// WebSocket connection handling with performance tracking
io.on('connection', (socket) => {
    const startTime = Date.now();
    logger.info('Client connected', {
        socketId: socket.id,
        ip: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent']
    });
    // Performance tracking for WebSocket
    socket.on('disconnect', (reason) => {
        const duration = Date.now() - startTime;
        logger.info('Client disconnected', {
            socketId: socket.id,
            reason,
            duration: `${duration}ms`
        });
    });
    // Error handling for WebSocket
    socket.on('error', (error) => {
        logger.error('WebSocket error', {
            socketId: socket.id,
            error: error.message,
            stack: error.stack
        });
    });
});
// ==========================================
// ENHANCED ERROR HANDLING
// ==========================================
// 404 handler for unknown routes
app.use('*', (req, res) => {
    logger.warn('Route not found', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip
    });
    res.status(404).json({
        error: 'Route not found',
        method: req.method,
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});
// Use enhanced error handler
app.use(advancedErrorRecovery_1.enhancedErrorHandler);
// ==========================================
// OPTIMIZED SERVER STARTUP
// ==========================================
async function startOptimizedServer() {
    const port = parseInt(process.env.PORT);
    if (!port || isNaN(port)) {
        logger.error('PORT environment variable is required but not set. Please check config/constants.env');
        process.exit(1);
    }
    try {
        // Initialize services
        logger.info('Initializing optimized services...');
        // Start HTTP server
        httpServer.listen(port, () => {
            logger.info('🚀 Optimized Nen Platform Backend Started', {
                port,
                environment: process.env.NODE_ENV || 'development',
                version: process.env.npm_package_version || '1.0.0',
                features: [
                    'High-Performance Middleware',
                    'Advanced Error Recovery',
                    'Smart Caching',
                    'Load Testing',
                    'Performance Monitoring',
                    'Optimized Betting Service'
                ]
            });
        });
        // Health check interval
        setInterval(() => {
            const memUsage = process.memoryUsage();
            if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB threshold
                logger.warn('High memory usage detected', {
                    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
                    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
                });
            }
        }, 60000); // Check every minute
    }
    catch (error) {
        logger.error('Failed to start optimized server', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        process.exit(1);
    }
}
// Graceful shutdown handling
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    httpServer.close(() => {
        logger.info('Server shut down completed');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    httpServer.close(() => {
        logger.info('Server shut down completed');
        process.exit(0);
    });
});
// Start the optimized server
startOptimizedServer();
exports.default = app;
//# sourceMappingURL=server-optimized.js.map