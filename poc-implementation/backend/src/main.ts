/**
 * Main Server Entry Point - Nen Platform POC

 *
 * Features:
 * - Consolidated server configuration
 * - Environment-based configuration
 * - Comprehensive error handling
 * - Health monitoring
 * - Graceful shutdown
 * - Production optimizations
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Import configuration
import config from './config';

// Import API routes
import authRoutes from './api/auth';
import bettingRoutes from './api/betting';
import matchesRoutes from './api/matches';
import usersRoutes from './api/users';
import analyticsRoutes from './api/analytics';
import blockchainRoutes from './routes/blockchain';

// Import legacy routes for backward compatibility
import legacyAiRoutes from './routes/ai';
import legacyGameRoutes from './routes/game';
import legacyEnhancedRoutes from './routes/enhanced';
import legacyUserRoutes from './routes/user';
import devnetRoutes from './routes/devnet';

// Import services
import { initializeServices } from './services';
import apiGateway from './middleware/apiGateway';
import { setupSimpleGameSocket } from './sockets/simpleGameSocket';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { metricsMiddleware, metricsApp } from './services/metrics';

class NenPlatformServer {
  private app: express.Application;
  private httpServer: any;
  private io: SocketIOServer | undefined;
  private logger!: winston.Logger;

  constructor() {
    this.app = express();
    this.setupLogger();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.httpServer = createServer(this.app);
    this.setupWebSocket();
  }

  private setupLogger(): void {
    // Ensure logs directory exists
    const logsDir = path.dirname(config.logging.filePath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    this.logger = winston.createLogger({
      level: config.logging.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'nen-platform-backend',
        environment: config.server.environment,
        version: process.env.npm_package_version || '1.0.0'
      },
      transports: [
        new winston.transports.File({
          filename: config.logging.filePath,
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ],
    });
  }

private setupMiddleware(): void {
    this.app.use(apiGateway);
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.security.corsOrigin,
      credentials: config.security.corsCredentials,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.security.rateLimitWindowMs,
      max: config.security.rateLimitMaxRequests,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message: string) => this.logger.info(message.trim())
      }
    }));

    this.app.use(requestLogger);
    this.app.use(metricsMiddleware);
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: config.server.environment,
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    });

    // New API structure (main endpoints)
    this.app.use('/api/auth', authRoutes);
  this.app.use('/api/betting', bettingRoutes);
    this.app.use('/api/matches', matchesRoutes);
    this.app.use('/api/users', usersRoutes);
    this.app.use('/api/analytics', analyticsRoutes);
    this.app.use('/api/blockchain', blockchainRoutes);
    this.app.use('/api/devnet', devnetRoutes);

    // Versioned API routes
    this.app.use('/api/v1/auth', authRoutes);
    this.app.use('/api/v1/betting', bettingRoutes);
    this.app.use('/api/v1/matches', matchesRoutes);
    this.app.use('/api/v1/users', usersRoutes);
    this.app.use('/api/v1/blockchain', blockchainRoutes);
    this.app.use('/api/v1/analytics', analyticsRoutes);
    this.app.use('/api/v1/devnet', devnetRoutes);
    // User Story 9: Training endpoints
    this.app.use('/api/v1/training', require('./routes/training').default);

    // Legacy routes for backward compatibility
    this.app.use('/api/ai', legacyAiRoutes);
    this.app.use('/api/game', legacyGameRoutes);
    // Legacy user routes (provide /api/user/* endpoints used by verification scripts)
    this.app.use('/api/user', legacyUserRoutes);
    this.app.use('/api/enhanced', legacyEnhancedRoutes);
    this.app.use('/metrics', metricsApp);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Nen Platform API',
        version: process.env.npm_package_version || '1.0.0',
        environment: config.server.environment,
        documentation: '/api-docs',
        health: '/health'
      });
    });

    // 404 handler
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

  private setupWebSocket(): void {
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: config.security.corsOrigin,
        methods: ['GET', 'POST'],
        credentials: config.security.corsCredentials
      },
      transports: ['websocket', 'polling'],
      pingTimeout: config.server.websocketTimeout,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6, // 1MB
      allowEIO3: true
    });

    setupSimpleGameSocket(this.io, this.logger);
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      this.logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack
      });
      this.gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      this.logger.error('Unhandled Rejection', {
        reason: reason,
        promise: promise
      });
      this.gracefulShutdown('unhandledRejection');
    });

    // Handle shutdown signals
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
  }

  public async start(): Promise<void> {
    try {
      // Initialize services
      await initializeServices();
      this.logger.info('Services initialized successfully');

      // Start HTTP server
      await new Promise<void>((resolve) => {
        this.httpServer.listen(config.server.port, () => {
          this.logger.info('Nen Platform Server started successfully', {
            port: config.server.port,
            environment: config.server.environment,
            corsOrigin: config.security.corsOrigin,
            nodeVersion: process.version,
            pid: process.pid
          });
          resolve();
        });
      });

      // Log server readiness
      this.logServerStatus();

    } catch (error) {
      this.logger.error('Failed to start server', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      process.exit(1);
    }
  }

  private logServerStatus(): void {
    this.logger.info('='.repeat(50));
    this.logger.info('🚀 NEN PLATFORM SERVER READY');
    this.logger.info('='.repeat(50));
    this.logger.info(`🌐 Environment: ${config.server.environment}`);
    this.logger.info(`🔗 API Server: http://${config.server.host}:${config.server.port}`);
    this.logger.info(`🏥 Health Check: http://${config.server.host}:${config.server.port}/health`);
    this.logger.info(`🎮 WebSocket: ws://${config.server.host}:${config.server.port}`);
    this.logger.info(`🤖 AI Service: ${config.externalServices.aiServiceUrl}`);
    this.logger.info(`🌍 Frontend: ${config.externalServices.frontendUrl}`);
    this.logger.info('='.repeat(50));
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    this.logger.info(`Received ${signal}, initiating graceful shutdown`);

    try {
      // Close WebSocket connections
      if (this.io) {
        this.io.close();
        this.logger.info('WebSocket server closed');
      }

      // Close HTTP server
      await new Promise<void>((resolve) => {
        this.httpServer.close(() => {
          this.logger.info('HTTP server closed');
          resolve();
        });
      });

      this.logger.info('Graceful shutdown completed');
      process.exit(0);

    } catch (error) {
      this.logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : String(error)
      });
      process.exit(1);
    }
  }

  public getApp(): express.Application {
    return this.app;
  }

  public getServer(): any {
    return this.httpServer;
  }

  public getIO(): SocketIOServer | undefined {
    return this.io;
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new NenPlatformServer();
  server.start().catch((error) => {
    console.error('Failed to start Nen Platform Server:', error);
    process.exit(1);
  });
}

export default NenPlatformServer;
export { NenPlatformServer };
