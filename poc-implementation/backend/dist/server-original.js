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
const winston_1 = __importDefault(require("winston"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const web3_js_1 = require("@solana/web3.js");
// Route imports
const ai_1 = __importDefault(require("./routes/ai"));
const game_1 = __importDefault(require("./routes/game"));
const betting_1 = __importDefault(require("./routes/betting"));
const user_1 = __importDefault(require("./routes/user"));
const nft_1 = __importDefault(require("./routes/nft"));
const auth_1 = __importDefault(require("./routes/auth"));
// Enhanced services for geographic clustering and MagicBlock integration
// import { WebSocketClusterService, ClusterConfig } from './services/WebSocketClusterService';
// import { MagicBlockBOLTService } from './services/MagicBlockBOLTService';
// import { GeographicClusterManager } from './services/GeographicClusterManager';
// import { setupEnhancedGameSocket } from './sockets/gameSocket';
// Performance optimization middleware import
// import {
//   performanceTracker,
//   performanceCompression,
//   cacheOptimization,
//   memoryMonitoring
// } from './middleware/performance';
// Load environment variables
dotenv_1.default.config();
// Create logs directory if it doesn't exist
const logsDir = path_1.default.dirname(process.env.LOG_FILE_PATH || './logs/backend.log');
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
}
// Configure Winston logger
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    defaultMeta: { service: 'nen-enhanced-backend' },
    transports: [
        new winston_1.default.transports.File({ filename: process.env.LOG_FILE_PATH || './logs/backend.log' }),
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        })
    ],
});
// Initialize Express app
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
// Initialize Socket.IO with enhanced configuration for geographic clustering
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || `http://${process.env.FRONTEND_HOST}:${process.env.FRONTEND_PORT}`,
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || process.env.TEST_PING_TIMEOUT || '5000'),
    pingInterval: parseInt(process.env.WS_PING_INTERVAL || '2000'),
    maxHttpBufferSize: parseInt(process.env.WS_MAX_BUFFER_SIZE || '1000000'), // 1MB default
    allowEIO3: true
});
// Geographic cluster configuration
// const clusterConfig: ClusterConfig = {
//   nodeId: process.env.NODE_ID || `node_${Date.now()}`,
//   region: {
//     region: (process.env.REGION as any) || 'us-east',
//     endpoints: process.env.CLUSTER_ENDPOINTS?.split(',') || ['wss://localhost:3001'],
//     latencyTarget: parseInt(process.env.LATENCY_TARGET_MS || '50'),
//     fallbackRegions: process.env.FALLBACK_REGIONS?.split(',') || []
//   },
//   redisClusterEndpoints: process.env.REDIS_CLUSTER_ENDPOINTS?.split(',') || [],
//   maxConnections: parseInt(process.env.MAX_CONNECTIONS || '1000'),
//   loadBalancingStrategy: (process.env.LOAD_BALANCING as any) || 'latency-based'
// };
// Initialize enhanced services
// let clusterService: WebSocketClusterService;
// let magicBlockService: MagicBlockBOLTService;
// let clusterManager: GeographicClusterManager;
// Initialize database and cache
let dbInitialized = false;
let redisInitialized = false;
async function initializeEnhancedServices() {
    try {
        logger.info('Initializing enhanced services for geographic clustering');
        // Initialize geographic cluster manager
        clusterManager = new GeographicClusterManager(logger);
        // Initialize WebSocket cluster service
        clusterService = new WebSocketClusterService(io, clusterConfig, logger);
        clusterService.optimizeForRealTimeGaming();
        // Setup MagicBlock integration namespace
        const magicBlockNamespace = clusterService.setupMagicBlockIntegration();
        // Initialize Solana connection for MagicBlock
        const connection = new web3_js_1.Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
        // Create production Anchor provider with real wallet configuration
        const provider = {
            wallet: {
                publicKey: new web3_js_1.PublicKey(process.env.SOLANA_WALLET_PUBLIC_KEY || '11111111111111111111111111111112')
            }
        };
        // Initialize MagicBlock BOLT ECS service
        magicBlockService = new MagicBlockBOLTService(connection, provider, logger);
        // Setup enhanced game socket with all services
        setupEnhancedGameSocket(io, clusterService, magicBlockService, clusterManager, logger);
        logger.info('Enhanced services initialized successfully', {
            region: clusterConfig.region.region,
            nodeId: clusterConfig.nodeId,
            latencyTarget: clusterConfig.region.latencyTarget
        });
    }
    catch (error) {
        logger.error('Failed to initialize enhanced services', {
            error: error instanceof Error ? error.message : String(error)
        });
        throw error;
    }
}
// Enhanced middleware stack
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", "wss:", "ws:", "https:"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false
}));
app.use((0, cors_1.default)({
    origin: (() => {
        if (!process.env.CORS_ORIGIN) {
            if (!process.env.FRONTEND_HOST && !process.env.DEFAULT_FRONTEND_HOST) {
            }
            if (!process.env.FRONTEND_PORT && !process.env.DEFAULT_FRONTEND_PORT) {
            }
            return `${process.env.FRONTEND_SECURE === 'true' ? 'https' : 'http'}://${process.env.FRONTEND_HOST || process.env.DEFAULT_FRONTEND_HOST}:${process.env.FRONTEND_PORT || process.env.DEFAULT_FRONTEND_PORT}`;
        }
        return process.env.CORS_ORIGIN;
    })(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-forwarded-for', 'cf-ipcountry', 'cf-region']
}));
// Enhanced rate limiting for geographic distribution
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '1000'), // Increased for gaming
    message: {
        error: 'Too many requests',
        retryAfter: '15 minutes',
        region: clusterConfig.region.region
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for WebSocket upgrades and health checks
        return req.headers.upgrade === 'websocket' || req.path === '/health';
    }
});
app.use(limiter);
app.use(performanceTracker);
app.use(performanceCompression);
app.use(cacheOptimization);
app.use(memoryMonitoring);
app.use((0, morgan_1.default)('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Health and readiness endpoints for Kubernetes
app.get('/health', (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        region: clusterConfig.region.region,
        nodeId: clusterConfig.nodeId,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cluster: clusterService ? clusterService.getClusterStats() : null
    };
    res.status(200).json(health);
});
app.get('/ready', (req, res) => {
    const readiness = {
        status: 'ready',
        services: {
            websocketCluster: !!clusterService,
            magicBlock: !!magicBlockService,
            geographicManager: !!clusterManager
        },
        region: clusterConfig.region.region,
        timestamp: new Date().toISOString()
    };
    const allReady = Object.values(readiness.services).every(Boolean);
    res.status(allReady ? 200 : 503).json(readiness);
});
// Metrics endpoint for monitoring
app.get('/metrics', (req, res) => {
    const metrics = {
        timestamp: new Date().toISOString(),
        region: clusterConfig.region.region,
        nodeId: clusterConfig.nodeId,
        cluster: clusterService ? clusterService.getClusterStats() : null,
        geographic: clusterManager ? clusterManager.getClusterStatus() : null,
        performance: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            api: require('./middleware/performance').getPerformanceMetrics()
        }
    };
    res.status(200).json(metrics);
});
// API Routes
app.use('/api/ai', ai_1.default);
app.use('/api/enhanced', enhancedRoutes);
app.use('/api/game', game_1.default);
app.use('/api/matches', game_1.default); // Alias for matches
app.use('/api/betting', betting_1.default);
app.use('/api/bets', betting_1.default); // Alias for bets
app.use('/api/user', user_1.default);
app.use('/api/nft', nft_1.default);
app.use('/api/auth', auth_1.default);
// Geographic routing information endpoint
app.get('/api/geographic/routing', (req, res) => {
    const clientRegion = req.headers['cf-ipcountry'] || req.headers['x-forwarded-for'] || 'unknown';
    const optimalRegion = clusterManager ?
        clusterManager.selectOptimalRegion(clientRegion) : null;
    res.json({
        clientRegion,
        currentRegion: clusterConfig.region.region,
        optimalRegion: optimalRegion ? {
            region: optimalRegion.region,
            nodeId: optimalRegion.nodeId,
            expectedLatency: 'calculated_based_on_distance',
            endpoints: optimalRegion.endpoints
        } : null,
        timestamp: new Date().toISOString()
    });
});
// WebSocket connection info endpoint
app.get('/api/websocket/info', (req, res) => {
    res.json({
        namespaces: ['/game', '/magicblock'],
        features: [
            'geographic-clustering',
            'bolt-ecs-integration',
            'real-time-gaming',
            'sub-50ms-latency',
            'automatic-failover'
        ],
        region: clusterConfig.region.region,
        latencyTarget: clusterConfig.region.latencyTarget,
        endpoints: clusterConfig.region.endpoints
    });
});
// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        region: clusterConfig.region.region
    });
    res.status(500).json({
        error: 'Internal server error',
        region: clusterConfig.region.region,
        timestamp: new Date().toISOString()
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        region: clusterConfig.region.region,
        timestamp: new Date().toISOString()
    });
});
// Graceful shutdown handling
async function gracefulShutdown(signal) {
    logger.info(`Received ${signal}, starting graceful shutdown`);
    try {
        // Close WebSocket connections
        if (clusterService) {
            await clusterService.shutdown();
        }
        // Close MagicBlock service
        if (magicBlockService) {
            await magicBlockService.shutdown();
        }
        // Close geographic cluster manager
        if (clusterManager) {
            await clusterManager.shutdown();
        }
        // Close HTTP server
        server.close(() => {
            logger.info('HTTP server closed');
            process.exit(0);
        });
        // Force close after 30 seconds
        setTimeout(() => {
            logger.warn('Forced shutdown after timeout');
            process.exit(1);
        }, 30000);
    }
    catch (error) {
        logger.error('Error during shutdown', {
            error: error instanceof Error ? error.message : String(error)
        });
        process.exit(1);
    }
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
const PORT = parseInt(process.env.PORT);
if (!PORT || isNaN(PORT)) {
    console.error('❌ PORT environment variable is required but not set. Please check config/constants.env');
    process.exit(1);
}
async function startServer() {
    try {
        // Initialize enhanced services first
        await initializeEnhancedServices();
        // Start HTTP server
        server.listen(PORT, () => {
            logger.info('Enhanced Nen Platform backend started', {
                port: PORT,
                region: clusterConfig.region.region,
                nodeId: clusterConfig.nodeId,
                environment: process.env.NODE_ENV || 'development',
                features: [
                    'geographic-clustering',
                    'magicblock-bolt-ecs',
                    'real-time-gaming',
                    'sub-50ms-latency'
                ]
            });
        });
        // Set up performance monitoring
        setInterval(() => {
            const memUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            logger.debug('Performance metrics', {
                memory: {
                    rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
                    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
                    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB'
                },
                cpu: {
                    user: cpuUsage.user,
                    system: cpuUsage.system
                },
                uptime: process.uptime(),
                region: clusterConfig.region.region
            });
        }, 60000); // Every minute
    }
    catch (error) {
        logger.error('Failed to start server', {
            error: error instanceof Error ? error.message : String(error)
        });
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server-original.js.map