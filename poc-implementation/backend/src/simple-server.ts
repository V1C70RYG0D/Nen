/**
 * Simple Backend Server - Nen Platform POC
 * 
 * A minimal working backend that follows GI guidelines
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';

// Load environment configuration
const configPath = path.resolve(process.cwd(), '..', 'config', '.env');
dotenv.config({ path: configPath });

// Also try loading from current directory for backwards compatibility
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Basic configuration
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
app.get('/', (req, res) => {
  res.json({
    name: 'Nen Platform API',
    version: '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api/*'
    }
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '0.1.0',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Basic API routes
app.get('/api/auth/status', (req, res) => {
  res.json({ status: 'ready', message: 'Auth service is available' });
});

app.get('/api/users/me', (req, res) => {
  res.json({ 
    id: 'demo-user',
    username: 'demo',
    status: 'active'
  });
});

app.get('/api/matches', (req, res) => {
  res.json({ 
    matches: [],
    total: 0,
    message: 'No active matches'
  });
});

app.get('/api/betting/pools', (req, res) => {
  res.json({ 
    pools: [],
    total: 0,
    message: 'No betting pools available'
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

io.on('connection', (socket) => {
  console.log(`🔌 WebSocket client connected: ${socket.id}`);
  
  socket.emit('welcome', {
    message: 'Connected to Nen Platform',
    serverId: socket.id,
    timestamp: new Date().toISOString()
  });

  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 WebSocket client disconnected: ${socket.id}`);
  });
});

// Error handling
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      '/',
      '/health',
      '/api/auth/status',
      '/api/users/me',
      '/api/matches',
      '/api/betting/pools'
    ]
  });
});

// Start server
function startServer() {
  return new Promise<void>((resolve, reject) => {
    httpServer.listen(PORT, HOST, () => {
      console.log('='.repeat(50));
      console.log('🚀 NEN PLATFORM BACKEND STARTED');
      console.log('='.repeat(50));
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Server: http://${HOST}:${PORT}`);
      console.log(`🏥 Health Check: http://${HOST}:${PORT}/health`);
      console.log(`🎮 WebSocket: ws://${HOST}:${PORT}`);
      console.log(`🌍 CORS Origin: ${CORS_ORIGIN}`);
      console.log('='.repeat(50));
      resolve();
    });

    httpServer.on('error', (error) => {
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
  startServer().catch((error) => {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  });
}

export default app;
export { startServer, httpServer, io };
