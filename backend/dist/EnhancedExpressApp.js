"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const logger_1 = require("./utils/logger");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const auth_1 = __importDefault(require("./routes/auth"));
const game_1 = __importDefault(require("./routes/game"));
const ai_1 = __importDefault(require("./routes/ai"));
const blockchain_1 = __importDefault(require("./routes/blockchain"));
const websocket_1 = __importDefault(require("./routes/websocket"));
const enhanced_v2_1 = __importDefault(require("./routes/enhanced-v2"));
const EnhancedAITrainingServiceV2_1 = require("./services/EnhancedAITrainingServiceV2");
const AdvancedLoadTestingService_1 = require("./services/AdvancedLoadTestingService");
const EnhancedComplianceServiceV2_1 = require("./services/EnhancedComplianceServiceV2");
class EnhancedExpressApp {
    app;
    server;
    io;
    isShuttingDown = false;
    constructor() {
        this.app = (0, express_1.default)();
        this.server = (0, http_1.createServer)(this.app);
        this.io = new socket_io_1.Server(this.server, {
            cors: {
                origin: process.env.FRONTEND_URL || (() => {
                    throw new Error('FRONTEND_URL must be set in environment variables. GI-18: No hardcoded values allowed.');
                })(),
                methods: ["GET", "POST"],
                credentials: true
            },
            transports: ['websocket', 'polling']
        });
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeWebSocketHandlers();
        this.initializeErrorHandling();
        this.initializeEnhancedServices();
    }
    initializeMiddleware() {
        this.app.use((0, helmet_1.default)({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    connectSrc: ["'self'", "ws:", "wss:"]
                }
            },
            crossOriginEmbedderPolicy: false
        }));
        this.app.use((0, cors_1.default)({
            origin: (origin, callback) => {
                if (!origin)
                    return callback(null, true);
                if (!process.env.FRONTEND_HOST && !process.env.DEFAULT_FRONTEND_HOST) {
                    throw new Error('FRONTEND_HOST or DEFAULT_FRONTEND_HOST must be set in environment variables. GI-18: No hardcoded values allowed.');
                }
                if (!process.env.FRONTEND_PORT && !process.env.DEFAULT_FRONTEND_PORT) {
                    throw new Error('FRONTEND_PORT or DEFAULT_FRONTEND_PORT must be set in environment variables. GI-18: No hardcoded values allowed.');
                }
                if (!process.env.BACKEND_HOST && !process.env.DEFAULT_BACKEND_HOST) {
                    throw new Error('BACKEND_HOST or DEFAULT_BACKEND_HOST must be set in environment variables. GI-18: No hardcoded values allowed.');
                }
                if (!process.env.BACKEND_PORT && !process.env.DEFAULT_BACKEND_PORT) {
                    throw new Error('BACKEND_PORT or DEFAULT_BACKEND_PORT must be set in environment variables. GI-18: No hardcoded values allowed.');
                }
                const allowedOrigins = [
                    `${process.env.FRONTEND_SECURE === 'true' ? 'https' : 'http'}://${process.env.FRONTEND_HOST || process.env.DEFAULT_FRONTEND_HOST}:${process.env.FRONTEND_PORT || process.env.DEFAULT_FRONTEND_PORT}`,
                    `${process.env.BACKEND_SECURE === 'true' ? 'https' : 'http'}://${process.env.BACKEND_HOST || process.env.DEFAULT_BACKEND_HOST}:${process.env.BACKEND_PORT || process.env.DEFAULT_BACKEND_PORT}`,
                    process.env.FRONTEND_URL,
                    process.env.ADMIN_URL
                ].filter(Boolean);
                if (allowedOrigins.includes(origin)) {
                    callback(null, true);
                }
                else {
                    logger_1.logger.warn('CORS blocked origin', { origin });
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true
        }));
        this.app.use((0, compression_1.default)({
            level: 6,
            threshold: 1024,
            filter: (req, res) => {
                if (req.headers['x-no-compression']) {
                    return false;
                }
                return compression_1.default.filter(req, res);
            }
        }));
        const generalLimiter = (0, express_rate_limit_1.default)({
            windowMs: 15 * 60 * 1000,
            max: process.env.NODE_ENV === 'production' ? 100 : 1000,
            message: {
                error: 'Too many requests, please try again later',
                retryAfter: '15 minutes'
            },
            standardHeaders: true,
            legacyHeaders: false,
            skip: (req) => {
                return req.path === '/health' || req.path === '/api/v1/enhanced/analytics/health';
            }
        });
        this.app.use(generalLimiter);
        this.app.use(express_1.default.json({
            limit: '10mb',
            verify: (req, res, buf) => {
                req.rawBody = buf;
            }
        }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        this.app.use((req, res, next) => {
            const startTime = Date.now();
            const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            req.headers['x-request-id'] = requestId;
            res.setHeader('x-request-id', requestId);
            res.on('finish', () => {
                const duration = Date.now() - startTime;
                logger_1.logger.info('HTTP Request', {
                    method: req.method,
                    url: req.url,
                    statusCode: res.statusCode,
                    duration,
                    requestId,
                    userAgent: req.get('User-Agent'),
                    ip: req.ip
                });
                if (duration > 5000) {
                    logger_1.logger.warn('Slow request detected', {
                        method: req.method,
                        url: req.url,
                        duration,
                        requestId
                    });
                }
            });
            next();
        });
        this.app.set('trust proxy', 1);
    }
    initializeRoutes() {
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: process.env.npm_package_version || '1.0.0',
                environment: process.env.NODE_ENV || 'development'
            });
        });
        this.app.use('/api/v1/auth', auth_1.default);
        this.app.use('/api/v1/game', game_1.default);
        this.app.use('/api/v1/ai', ai_1.default);
        this.app.use('/api/v1/blockchain', blockchain_1.default);
        this.app.use('/api/v1/websocket', websocket_1.default);
        this.app.use('/api/v1/enhanced', enhanced_v2_1.default);
        this.app.get('/', (req, res) => {
            res.json({
                message: 'Nen Platform POC Backend - Enhanced V2',
                version: '2.0.0',
                status: 'operational',
                timestamp: new Date().toISOString(),
                docs: '/api/v1/docs',
                enhancements: [
                    'Advanced AI Training with Weekly Scheduling',
                    'Load Testing for 1000+ Concurrent Games',
                    'Enhanced Compliance with Fraud Detection',
                    'Comprehensive Test Coverage',
                    'Production Ready Deployment'
                ]
            });
        });
        this.app.get('/api/v1/docs', (req, res) => {
            res.json({
                title: 'Nen Platform POC API Documentation',
                version: '2.0.0',
                baseUrl: '/api/v1',
                endpoints: {
                    authentication: {
                        login: 'POST /auth/login',
                        register: 'POST /auth/register',
                        refresh: 'POST /auth/refresh'
                    },
                    game: {
                        create: 'POST /game/create',
                        join: 'POST /game/join',
                        move: 'POST /game/move',
                        status: 'GET /game/:id/status'
                    },
                    ai: {
                        analyze: 'POST /ai/analyze',
                        training: 'POST /ai/training/start',
                        metrics: 'GET /ai/metrics'
                    },
                    blockchain: {
                        deploy: 'POST /blockchain/deploy',
                        transaction: 'POST /blockchain/transaction',
                        balance: 'GET /blockchain/balance/:address'
                    },
                    enhanced: {
                        aiTraining: {
                            schedule: 'POST /enhanced/ai-training/schedule',
                            start: 'POST /enhanced/ai-training/start',
                            metrics: 'GET /enhanced/ai-training/metrics/:agentId',
                            sessions: 'GET /enhanced/ai-training/sessions'
                        },
                        loadTesting: {
                            execute: 'POST /enhanced/load-testing/execute',
                            status: 'GET /enhanced/load-testing/status',
                            recommendations: 'GET /enhanced/load-testing/recommendations'
                        },
                        compliance: {
                            fraudCheck: 'POST /enhanced/compliance/fraud-check',
                            kycVerify: 'POST /enhanced/compliance/kyc-verify',
                            metrics: 'GET /enhanced/compliance/metrics'
                        },
                        analytics: {
                            performance: 'GET /enhanced/analytics/performance',
                            health: 'GET /enhanced/analytics/health'
                        }
                    }
                }
            });
        });
        this.app.use('*', (req, res) => {
            logger_1.logger.warn('Route not found', {
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            res.status(404).json({
                error: 'Route not found',
                message: `${req.method} ${req.originalUrl} does not exist`,
                suggestion: 'Check /api/v1/docs for available endpoints',
                timestamp: new Date().toISOString()
            });
        });
    }
    initializeWebSocketHandlers() {
        this.io.use((socket, next) => {
            const token = socket.handshake.auth.token || socket.handshake.query.token;
            if (!token) {
                logger_1.logger.warn('WebSocket connection without token', {
                    socketId: socket.id,
                    ip: socket.handshake.address
                });
                return next(new Error('Authentication token required'));
            }
            next();
        });
        this.io.on('connection', (socket) => {
            logger_1.logger.info('WebSocket connection established', {
                socketId: socket.id,
                ip: socket.handshake.address,
                userAgent: socket.handshake.headers['user-agent']
            });
            const userId = socket.handshake.query.userId;
            if (userId) {
                socket.join(`user:${userId}`);
                logger_1.logger.debug('User joined personal room', { socketId: socket.id, userId });
            }
            socket.on('join-game', (gameId) => {
                socket.join(`game:${gameId}`);
                socket.to(`game:${gameId}`).emit('player-joined', {
                    socketId: socket.id,
                    timestamp: new Date().toISOString()
                });
                logger_1.logger.debug('Player joined game room', { socketId: socket.id, gameId });
            });
            socket.on('leave-game', (gameId) => {
                socket.leave(`game:${gameId}`);
                socket.to(`game:${gameId}`).emit('player-left', {
                    socketId: socket.id,
                    timestamp: new Date().toISOString()
                });
                logger_1.logger.debug('Player left game room', { socketId: socket.id, gameId });
            });
            socket.on('game-move', (data) => {
                socket.to(`game:${data.gameId}`).emit('move-made', {
                    ...data,
                    playerId: socket.id,
                    serverTimestamp: new Date().toISOString()
                });
                logger_1.logger.debug('Game move broadcast', {
                    socketId: socket.id,
                    gameId: data.gameId
                });
            });
            socket.on('subscribe-training', (agentId) => {
                socket.join(`training:${agentId}`);
                logger_1.logger.debug('Subscribed to training updates', { socketId: socket.id, agentId });
            });
            socket.on('subscribe-load-test', () => {
                socket.join('load-test-updates');
                logger_1.logger.debug('Subscribed to load test updates', { socketId: socket.id });
            });
            socket.on('subscribe-compliance', () => {
                socket.join('compliance-alerts');
                logger_1.logger.debug('Subscribed to compliance alerts', { socketId: socket.id });
            });
            socket.on('disconnect', (reason) => {
                logger_1.logger.info('WebSocket disconnection', {
                    socketId: socket.id,
                    reason,
                    ip: socket.handshake.address
                });
            });
            socket.on('error', (error) => {
                logger_1.logger.error('WebSocket error', {
                    socketId: socket.id,
                    error: error.message,
                    stack: error.stack
                });
            });
        });
        setInterval(() => {
            this.io.emit('system-heartbeat', {
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                connections: this.io.engine.clientsCount
            });
        }, 30000);
    }
    async initializeEnhancedServices() {
        try {
            logger_1.logger.info('Initializing enhanced services...');
            const aiTrainingService = (0, EnhancedAITrainingServiceV2_1.getEnhancedAITrainingServiceV2)();
            await aiTrainingService.initialize();
            logger_1.logger.info('Enhanced AI Training Service V2 initialized');
            const loadTestingService = (0, AdvancedLoadTestingService_1.getAdvancedLoadTestingService)();
            await loadTestingService.initialize();
            logger_1.logger.info('Advanced Load Testing Service initialized');
            const complianceService = (0, EnhancedComplianceServiceV2_1.getEnhancedComplianceService)();
            await complianceService.initialize();
            logger_1.logger.info('Enhanced Compliance Service V2 initialized');
            this.setupRealTimeEvents();
            logger_1.logger.info('All enhanced services initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize enhanced services', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    setupRealTimeEvents() {
        const aiTrainingService = (0, EnhancedAITrainingServiceV2_1.getEnhancedAITrainingServiceV2)();
        aiTrainingService.on('training-progress', (data) => {
            this.io.to(`training:${data.agentId}`).emit('training-progress', data);
        });
        aiTrainingService.on('training-complete', (data) => {
            this.io.to(`training:${data.agentId}`).emit('training-complete', data);
        });
        const loadTestingService = (0, AdvancedLoadTestingService_1.getAdvancedLoadTestingService)();
        loadTestingService.on('load-test-progress', (data) => {
            this.io.to('load-test-updates').emit('load-test-progress', data);
        });
        loadTestingService.on('load-test-complete', (data) => {
            this.io.to('load-test-updates').emit('load-test-complete', data);
        });
        const complianceService = (0, EnhancedComplianceServiceV2_1.getEnhancedComplianceService)();
        complianceService.on('fraud-detected', (data) => {
            this.io.to('compliance-alerts').emit('fraud-detected', data);
        });
        complianceService.on('investigation-created', (data) => {
            this.io.to('compliance-alerts').emit('investigation-created', data);
        });
    }
    initializeErrorHandling() {
        this.app.use((error, req, res, next) => {
            const requestId = req.headers['x-request-id'];
            logger_1.logger.error('Global error handler', {
                error: error.message,
                stack: error.stack,
                requestId,
                method: req.method,
                url: req.url,
                body: req.body,
                ip: req.ip
            });
            const isDevelopment = process.env.NODE_ENV === 'development';
            res.status(error.status || 500).json({
                success: false,
                error: isDevelopment ? error.message : 'Internal server error',
                requestId,
                timestamp: new Date().toISOString(),
                ...(isDevelopment && { stack: error.stack })
            });
        });
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('Uncaught exception', {
                error: error.message,
                stack: error.stack
            });
            this.gracefulShutdown('uncaughtException');
        });
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.logger.error('Unhandled rejection', {
                reason: reason instanceof Error ? reason.message : String(reason),
                stack: reason instanceof Error ? reason.stack : undefined,
                promise: promise.toString()
            });
            this.gracefulShutdown('unhandledRejection');
        });
        process.on('SIGTERM', () => {
            logger_1.logger.info('SIGTERM received');
            this.gracefulShutdown('SIGTERM');
        });
        process.on('SIGINT', () => {
            logger_1.logger.info('SIGINT received');
            this.gracefulShutdown('SIGINT');
        });
    }
    async gracefulShutdown(signal) {
        if (this.isShuttingDown) {
            logger_1.logger.warn('Shutdown already in progress');
            return;
        }
        this.isShuttingDown = true;
        logger_1.logger.info(`Graceful shutdown initiated by ${signal}`);
        try {
            this.server.close(() => {
                logger_1.logger.info('HTTP server closed');
            });
            this.io.close(() => {
                logger_1.logger.info('WebSocket server closed');
            });
            const aiTrainingService = (0, EnhancedAITrainingServiceV2_1.getEnhancedAITrainingServiceV2)();
            const complianceService = (0, EnhancedComplianceServiceV2_1.getEnhancedComplianceService)();
            await Promise.all([
                aiTrainingService.shutdown(),
                complianceService.shutdown()
            ]);
            const db = (0, database_1.getDatabase)();
            await db.end();
            logger_1.logger.info('Database connections closed');
            const redis = (0, redis_1.getRedisClient)();
            await redis.quit();
            logger_1.logger.info('Redis connections closed');
            logger_1.logger.info('Graceful shutdown completed');
            process.exit(0);
        }
        catch (error) {
            logger_1.logger.error('Error during graceful shutdown', {
                error: error instanceof Error ? error.message : String(error)
            });
            process.exit(1);
        }
    }
    async start(port = 3001) {
        try {
            const db = (0, database_1.getDatabase)();
            await db.query('SELECT NOW()');
            logger_1.logger.info('Database connection verified');
            const redis = (0, redis_1.getRedisClient)();
            await redis.ping();
            logger_1.logger.info('Redis connection verified');
            this.server.listen(port, () => {
                logger_1.logger.info('Enhanced Nen Platform POC Backend started', {
                    port,
                    environment: process.env.NODE_ENV || 'development',
                    version: '2.0.0',
                    timestamp: new Date().toISOString(),
                    processId: process.pid,
                    enhancements: [
                        'Advanced AI Training with Weekly Scheduling',
                        'Load Testing for 1000+ Concurrent Games',
                        'Enhanced Compliance with Fraud Detection',
                        'Comprehensive Test Coverage',
                        'Production Ready Deployment'
                    ]
                });
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to start enhanced server', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    getApp() {
        return this.app;
    }
    getIO() {
        return this.io;
    }
    getServer() {
        return this.server;
    }
}
exports.default = EnhancedExpressApp;
//# sourceMappingURL=EnhancedExpressApp.js.map