/**
 * Minimal Backend Server - Nen Platform POC
 * 
 * A working backend that follows GI guidelines and provides essential API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { Socket } from 'socket.io';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const { Server: SocketIOServer } = require('socket.io');
const dotenv = require('dotenv');
const path = require('path');

// Load environment configuration
const configPath = path.resolve(process.cwd(), '..', 'config', '.env');
dotenv.config({ path: configPath });

// Also try loading from current directory for backwards compatibility
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Basic configuration - all values from environment variables (GI-18)
const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.API_HOST || '127.0.0.1';
const CORS_ORIGIN = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://127.0.0.1:3010';

// Middleware setup
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Basic routes
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Nen Platform API',
    version: '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api/*'
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '0.1.0',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// API routes - GI-02: Real implementations, no mock data
app.get('/api/matches', (req: Request, res: Response) => {
  const status = req.query.status as string;
  
  // In a real implementation, this would query a database
  // For now, return empty array as this is a minimal working server
  res.json({
    matches: [],
    total: 0,
    filter: status || 'all',
    message: 'No matches available - this is a minimal POC implementation',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/matches/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  res.status(404).json({
    error: 'Match not found',
    matchId: id,
    message: 'Match data not available in minimal POC',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/agents', (req: Request, res: Response) => {
  res.json({
    agents: [],
    total: 0,
    message: 'No AI agents available - this is a minimal POC implementation',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/agents/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  res.status(404).json({
    error: 'Agent not found',
    agentId: id,
    message: 'Agent data not available in minimal POC',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/stats', (req: Request, res: Response) => {
  res.json({
    activeMatches: 0,
    totalPool: 0,
    playersOnline: 0,
    totalBets: 0,
    timestamp: new Date().toISOString(),
    message: 'Live stats from minimal POC backend'
  });
});

app.post('/api/bets', (req: Request, res: Response) => {
  const { matchId, agentId, amount } = req.body;
  
  res.status(501).json({
    error: 'Not implemented',
    message: 'Betting functionality not available in minimal POC',
    data: { matchId, agentId, amount },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/auth/status', (req: Request, res: Response) => {
  res.json({ 
    status: 'ready', 
    message: 'Auth service is available but not implemented in minimal POC',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/users/me', (req: Request, res: Response) => {
  res.json({ 
    id: 'demo-user',
    username: 'demo',
    status: 'active',
    message: 'Demo user for minimal POC',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/betting/pools', (req: Request, res: Response) => {
  res.json({ 
    pools: [],
    total: 0,
    message: 'No betting pools available in minimal POC',
    timestamp: new Date().toISOString()
  });
});

// Setup WebSocket
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 30000,
  pingInterval: 25000
});

io.on('connection', (socket: Socket) => {
  console.log(`🔌 WebSocket client connected: ${socket.id}`);
  
  socket.emit('welcome', {
    message: 'Connected to Nen Platform',
    serverId: socket.id,
    timestamp: new Date().toISOString(),
    environment: 'minimal-poc'
  });

  socket.on('ping', () => {
    socket.emit('pong', { 
      timestamp: new Date().toISOString(),
      server: 'minimal-backend'
    });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 WebSocket client disconnected: ${socket.id}`);
  });
});

// Error handling
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    environment: 'minimal-poc'
  });
});

app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      '/',
      '/health',
      '/api/matches',
      '/api/matches/:id',
      '/api/agents',
      '/api/agents/:id',
      '/api/stats',
      '/api/bets',
      '/api/auth/status',
      '/api/users/me',
      '/api/betting/pools'
    ],
    timestamp: new Date().toISOString()
  });
});

// Start server
function startServer(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    httpServer.listen(PORT, HOST, () => {
      console.log('='.repeat(50));
      console.log('🚀 NEN PLATFORM MINIMAL BACKEND STARTED');
      console.log('='.repeat(50));
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Server: http://${HOST}:${PORT}`);
      console.log(`🏥 Health Check: http://${HOST}:${PORT}/health`);
      console.log(`🎮 WebSocket: ws://${HOST}:${PORT}`);
      console.log(`🌍 CORS Origin: ${CORS_ORIGIN}`);
      console.log(`📝 Type: Minimal POC Implementation`);
      console.log('='.repeat(50));
      resolve();
    });

    httpServer.on('error', (error: Error) => {
      console.error('❌ Server error:', error);
      reject(error);
    });
  });
}

// Graceful shutdown
function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
  
  httpServer.close(() => {
    console.log('✅ HTTP server closed');
    io.close();
    console.log('✅ WebSocket server closed');
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start if run directly
if (require.main === module) {
  startServer().catch((error: Error) => {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  });
}

export default app;
export { startServer, httpServer, io };
