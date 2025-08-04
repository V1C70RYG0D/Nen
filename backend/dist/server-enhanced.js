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
const ai_1 = __importDefault(require("./routes/ai"));
const enhanced_1 = __importDefault(require("./routes/enhanced"));
const WebSocketClusterService_1 = require("./services/WebSocketClusterService");
const MagicBlockBOLTService_1 = require("./services/MagicBlockBOLTService");
const GeographicClusterManager_1 = require("./services/GeographicClusterManager");
const gameSocket_1 = require("./sockets/gameSocket");
dotenv_1.default.config();
const logsDir = path_1.default.dirname(process.env.LOG_FILE_PATH || './logs/backend.log');
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
}
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
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN,
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 5000,
    pingInterval: 2000,
    maxHttpBufferSize: 1e6,
    allowEIO3: true
});
const clusterConfig = {
    nodeId: process.env.NODE_ID || `node_${Date.now()}`,
    region: {
        region: process.env.REGION || 'us-east',
        endpoints: process.env.CLUSTER_ENDPOINTS?.split(',') || [process.env.WS_ENDPOINT],
        latencyTarget: parseInt(process.env.LATENCY_TARGET_MS || '50'),
        fallbackRegions: process.env.FALLBACK_REGIONS?.split(',') || []
    },
    redisClusterEndpoints: process.env.REDIS_CLUSTER_ENDPOINTS?.split(',') || [],
    maxConnections: parseInt(process.env.MAX_CONNECTIONS || '1000'),
    loadBalancingStrategy: process.env.LOAD_BALANCING || 'latency-based'
};
let clusterService;
let magicBlockService;
let clusterManager;
async function initializeEnhancedServices() {
    try {
        logger.info('Initializing enhanced services for geographic clustering');
        clusterManager = new GeographicClusterManager_1.GeographicClusterManager(logger);
        clusterService = new WebSocketClusterService_1.WebSocketClusterService(io, clusterConfig, logger);
        clusterService.optimizeForRealTimeGaming();
        const magicBlockNamespace = clusterService.setupMagicBlockIntegration();
        const connection = new web3_js_1.Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
        const walletPublicKey = process.env.SOLANA_WALLET_PUBLIC_KEY || '11111111111111111111111111111112';
        const provider = {
            wallet: { publicKey: new web3_js_1.PublicKey(walletPublicKey) }
        };
        magicBlockService = new MagicBlockBOLTService_1.MagicBlockBOLTService(connection, provider, logger);
        (0, gameSocket_1.setupEnhancedGameSocket)(io, clusterService, magicBlockService, clusterManager, logger);
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
    origin: process.env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-forwarded-for', 'cf-ipcountry', 'cf-region']
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX || '1000'),
    message: {
        error: 'Too many requests',
        retryAfter: '15 minutes',
        region: clusterConfig.region.region
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return req.headers.upgrade === 'websocket' || req.path === '/health';
    }
});
app.use(limiter);
app.use((0, morgan_1.default)('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
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
            cpu: process.cpuUsage()
        }
    };
    res.status(200).json(metrics);
});
app.use('/api/ai', ai_1.default);
app.use('/api/enhanced', enhanced_1.default);
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
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        region: clusterConfig.region.region,
        timestamp: new Date().toISOString()
    });
});
async function gracefulShutdown(signal) {
    logger.info(`Received ${signal}, starting graceful shutdown`);
    try {
        if (clusterService) {
            await clusterService.shutdown();
        }
        if (magicBlockService) {
            await magicBlockService.shutdown();
        }
        if (clusterManager) {
            await clusterManager.shutdown();
        }
        server.close(() => {
            logger.info('HTTP server closed');
            process.exit(0);
        });
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
const PORT = parseInt(process.env.PORT || '3001');
async function startServer() {
    try {
        await initializeEnhancedServices();
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
        }, 60000);
    }
    catch (error) {
        logger.error('Failed to start server', {
            error: error instanceof Error ? error.message : String(error)
        });
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server-enhanced.js.map