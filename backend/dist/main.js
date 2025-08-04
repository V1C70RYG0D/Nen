"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NenPlatformServer = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const winston_1 = __importDefault(require("winston"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("./config"));
const auth_1 = __importDefault(require("./api/auth"));
const betting_1 = __importDefault(require("./api/betting"));
const matches_1 = __importDefault(require("./api/matches"));
const users_1 = __importDefault(require("./api/users"));
const analytics_1 = __importDefault(require("./api/analytics"));
const ai_1 = __importDefault(require("./routes/ai"));
const game_1 = __importDefault(require("./routes/game"));
const enhanced_1 = __importDefault(require("./routes/enhanced"));
const services_1 = require("./services");
const apiGateway_1 = __importDefault(require("./middleware/apiGateway"));
const simpleGameSocket_1 = require("./sockets/simpleGameSocket");
const errorHandler_1 = require("./middleware/errorHandler");
const requestLogger_1 = require("./middleware/requestLogger");
const metrics_1 = require("./services/metrics");
class NenPlatformServer {
    app;
    httpServer;
    io;
    logger;
    constructor() {
        this.app = (0, express_1.default)();
        this.setupLogger();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
        this.httpServer = (0, http_1.createServer)(this.app);
        this.setupWebSocket();
    }
    setupLogger() {
        const logsDir = path_1.default.dirname(config_1.default.logging.filePath);
        if (!fs_1.default.existsSync(logsDir)) {
            fs_1.default.mkdirSync(logsDir, { recursive: true });
        }
        this.logger = winston_1.default.createLogger({
            level: config_1.default.logging.level,
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
            defaultMeta: {
                service: 'nen-platform-backend',
                environment: config_1.default.server.environment,
                version: process.env.npm_package_version || '1.0.0'
            },
            transports: [
                new winston_1.default.transports.File({
                    filename: config_1.default.logging.filePath,
                    maxsize: 5242880,
                    maxFiles: 5
                }),
                new winston_1.default.transports.Console({
                    format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
                })
            ],
        });
    }
    setupMiddleware() {
        this.app.use(apiGateway_1.default);
        this.app.use((0, helmet_1.default)({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                },
            },
        }));
        this.app.use((0, cors_1.default)({
            origin: config_1.default.security.corsOrigin,
            credentials: config_1.default.security.corsCredentials,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));
        const limiter = (0, express_rate_limit_1.default)({
            windowMs: config_1.default.security.rateLimitWindowMs,
            max: config_1.default.security.rateLimitMaxRequests,
            message: 'Too many requests from this IP, please try again later.',
            standardHeaders: true,
            legacyHeaders: false,
        });
        this.app.use('/api/', limiter);
        this.app.use((0, compression_1.default)());
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        this.app.use((0, morgan_1.default)('combined', {
            stream: {
                write: (message) => this.logger.info(message.trim())
            }
        }));
        this.app.use(requestLogger_1.requestLogger);
        this.app.use(metrics_1.metricsMiddleware);
    }
    setupRoutes() {
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                environment: config_1.default.server.environment,
                version: process.env.npm_package_version || '1.0.0',
                uptime: process.uptime(),
                memory: process.memoryUsage()
            });
        });
        this.app.use('/api/auth', auth_1.default);
        this.app.use('/api/betting', betting_1.default);
        this.app.use('/api/matches', matches_1.default);
        this.app.use('/api/users', users_1.default);
        this.app.use('/api/analytics', analytics_1.default);
        this.app.use('/api/v1/auth', auth_1.default);
        this.app.use('/api/v1/betting', betting_1.default);
        this.app.use('/api/v1/matches', matches_1.default);
        this.app.use('/api/v1/users', users_1.default);
        this.app.use('/api/v1/analytics', analytics_1.default);
        this.app.use('/api/ai', ai_1.default);
        this.app.use('/api/game', game_1.default);
        this.app.use('/api/user', users_1.default);
        this.app.use('/api/enhanced', enhanced_1.default);
        this.app.use('/metrics', metrics_1.metricsApp);
        this.app.get('/', (req, res) => {
            res.json({
                name: 'Nen Platform API',
                version: process.env.npm_package_version || '1.0.0',
                environment: config_1.default.server.environment,
                documentation: '/api-docs',
                health: '/health'
            });
        });
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Route ${req.originalUrl} not found`,
                availableRoutes: [
                    '/health',
                    '/api/auth',
                    '/api/betting',
                    '/api/matches',
                    '/api/users',
                    '/api/analytics',
                    '/api/v1/auth',
                    '/api/v1/betting',
                    '/api/v1/matches',
                    '/api/v1/users',
                    '/api/v1/analytics'
                ]
            });
        });
    }
    setupWebSocket() {
        this.io = new socket_io_1.Server(this.httpServer, {
            cors: {
                origin: config_1.default.security.corsOrigin,
                methods: ['GET', 'POST'],
                credentials: config_1.default.security.corsCredentials
            },
            transports: ['websocket', 'polling'],
            pingTimeout: config_1.default.server.websocketTimeout,
            pingInterval: 25000,
            maxHttpBufferSize: 1e6,
            allowEIO3: true
        });
        (0, simpleGameSocket_1.setupSimpleGameSocket)(this.io, this.logger);
    }
    setupErrorHandling() {
        this.app.use(errorHandler_1.errorHandler);
        process.on('uncaughtException', (error) => {
            this.logger.error('Uncaught Exception', {
                error: error.message,
                stack: error.stack
            });
            this.gracefulShutdown('uncaughtException');
        });
        process.on('unhandledRejection', (reason, promise) => {
            this.logger.error('Unhandled Rejection', {
                reason: reason,
                promise: promise
            });
            this.gracefulShutdown('unhandledRejection');
        });
        process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    }
    async start() {
        try {
            await (0, services_1.initializeServices)();
            this.logger.info('Services initialized successfully');
            await new Promise((resolve) => {
                this.httpServer.listen(config_1.default.server.port, () => {
                    this.logger.info('Nen Platform Server started successfully', {
                        port: config_1.default.server.port,
                        environment: config_1.default.server.environment,
                        corsOrigin: config_1.default.security.corsOrigin,
                        nodeVersion: process.version,
                        pid: process.pid
                    });
                    resolve();
                });
            });
            this.logServerStatus();
        }
        catch (error) {
            this.logger.error('Failed to start server', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
            process.exit(1);
        }
    }
    logServerStatus() {
        this.logger.info('='.repeat(50));
        this.logger.info('🚀 NEN PLATFORM SERVER READY');
        this.logger.info('='.repeat(50));
        this.logger.info(`🌐 Environment: ${config_1.default.server.environment}`);
        this.logger.info(`🔗 API Server: http://${config_1.default.server.host}:${config_1.default.server.port}`);
        this.logger.info(`🏥 Health Check: http://${config_1.default.server.host}:${config_1.default.server.port}/health`);
        this.logger.info(`🎮 WebSocket: ws://${config_1.default.server.host}:${config_1.default.server.port}`);
        this.logger.info(`🤖 AI Service: ${config_1.default.externalServices.aiServiceUrl}`);
        this.logger.info(`🌍 Frontend: ${config_1.default.externalServices.frontendUrl}`);
        this.logger.info('='.repeat(50));
    }
    async gracefulShutdown(signal) {
        this.logger.info(`Received ${signal}, initiating graceful shutdown`);
        try {
            if (this.io) {
                this.io.close();
                this.logger.info('WebSocket server closed');
            }
            await new Promise((resolve) => {
                this.httpServer.close(() => {
                    this.logger.info('HTTP server closed');
                    resolve();
                });
            });
            this.logger.info('Graceful shutdown completed');
            process.exit(0);
        }
        catch (error) {
            this.logger.error('Error during shutdown', {
                error: error instanceof Error ? error.message : String(error)
            });
            process.exit(1);
        }
    }
    getApp() {
        return this.app;
    }
    getServer() {
        return this.httpServer;
    }
    getIO() {
        return this.io;
    }
}
exports.NenPlatformServer = NenPlatformServer;
if (require.main === module) {
    const server = new NenPlatformServer();
    server.start().catch((error) => {
        console.error('Failed to start Nen Platform Server:', error);
        process.exit(1);
    });
}
exports.default = NenPlatformServer;
//# sourceMappingURL=main.js.map