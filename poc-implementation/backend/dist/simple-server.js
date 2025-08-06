"use strict";
/**
 * Simple Backend Server - Nen Platform POC
 *
 * A minimal working backend that follows GI guidelines
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.httpServer = void 0;
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment configuration
const configPath = path_1.default.resolve(process.cwd(), '..', 'config', '.env');
dotenv_1.default.config({ path: configPath });
// Also try loading from current directory for backwards compatibility
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
exports.httpServer = httpServer;
// Basic configuration
const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.API_HOST || '127.0.0.1';
const CORS_ORIGIN = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://127.0.0.1:3010';
// Middleware setup
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
app.use((0, cors_1.default)({
    origin: CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
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
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: CORS_ORIGIN,
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 25000
});
exports.io = io;
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
app.use((error, req, res, next) => {
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
    return new Promise((resolve, reject) => {
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
function gracefulShutdown(signal) {
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
exports.default = app;
//# sourceMappingURL=simple-server.js.map