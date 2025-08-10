import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import fs from 'fs';
import path from 'path';
import { Connection, PublicKey } from '@solana/web3.js';

// Database and caching imports
import { initializeDatabase } from './utils/database';
import { initializeRedis } from './utils/redis';

// Route imports
import aiRoutes from './routes/ai';
import gameRoutes from './routes/game';
import bettingRoutes from './routes/betting';
import userRoutes from './routes/user';
import nftRoutes from './routes/nft';
import authRoutes from './routes/auth';
import matchRoutes from './routes/match';

// Middleware imports
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { kycMiddleware } from './middleware/kyc';

// Service imports
import { GameService } from './services/GameService';
import { BettingService } from './services/BettingService';
import { AIService } from './services/AIService';
import { UserService } from './services/UserService';

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
dotenv.config();

// Create logs directory if it doesn't exist
const logsDir = path.dirname(process.env.LOG_FILE_PATH || './logs/backend.log');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'nen-enhanced-backend' },
  transports: [
    new winston.transports.File({ filename: process.env.LOG_FILE_PATH || './logs/backend.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
});

// Initialize Express app
const app = express();
const server = createServer(app);

// Initialize Socket.IO with enhanced configuration for geographic clustering
const io = new SocketIOServer(server, {
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
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );

    // Create production Anchor provider with real wallet configuration
    const provider = {
      wallet: {
        publicKey: new PublicKey(process.env.SOLANA_WALLET_PUBLIC_KEY || '11111111111111111111111111111112')
      }
    };

    // Initialize MagicBlock BOLT ECS service
    magicBlockService = new MagicBlockBOLTService(connection, provider, logger);

    // Setup enhanced game socket with all services
    setupEnhancedGameSocket(
      io,
      clusterService,
      magicBlockService,
      clusterManager,
      logger
    );

    logger.info('Enhanced services initialized successfully', {
      region: clusterConfig.region.region,
      nodeId: clusterConfig.nodeId,
      latencyTarget: clusterConfig.region.latencyTarget
    });

  } catch (error) {
    logger.error('Failed to initialize enhanced services', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

// Enhanced middleware stack
app.use(helmet({
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

app.use(cors({
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
const limiter = rateLimit({
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

app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.use('/api/ai', aiRoutes);
app.use('/api/enhanced', enhancedRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/matches', gameRoutes); // Alias for matches
app.use('/api/betting', bettingRoutes);
app.use('/api/bets', bettingRoutes); // Alias for bets
app.use('/api/user', userRoutes);
app.use('/api/nft', nftRoutes);
app.use('/api/auth', authRoutes);

// Geographic routing information endpoint
app.get('/api/geographic/routing', (req, res) => {
  const clientRegion = req.headers['cf-ipcountry'] || req.headers['x-forwarded-for'] || 'unknown';
  const optimalRegion = clusterManager ?
    clusterManager.selectOptimalRegion(clientRegion as string) : null;

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
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
async function gracefulShutdown(signal: string) {
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

  } catch (error) {
    logger.error('Error during shutdown', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));


const PORT = parseInt(process.env.PORT as string);

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

  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

startServer();
