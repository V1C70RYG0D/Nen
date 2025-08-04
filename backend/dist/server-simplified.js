"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.io = void 0;
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
const database_1 = require("./utils/database");
const redis_1 = require("./utils/redis");
const ai_1 = __importDefault(require("./routes/ai"));
const game_1 = __importDefault(require("./routes/game"));
const betting_1 = __importDefault(require("./routes/betting"));
const user_1 = __importDefault(require("./routes/user"));
const nft_1 = __importDefault(require("./routes/nft"));
const auth_1 = __importDefault(require("./routes/auth"));
const match_1 = __importDefault(require("./routes/match"));
const errorHandler_1 = require("./middleware/errorHandler");
dotenv_1.default.config();
const logsDir = path_1.default.dirname(process.env.LOG_FILE_PATH || './logs/backend.log');
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
}
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    defaultMeta: { service: 'nen-poc-backend' },
    transports: [
        new winston_1.default.transports.File({ filename: process.env.LOG_FILE_PATH || './logs/backend.log' }),
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        })
    ],
});
exports.logger = logger;
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 5000,
    pingInterval: 2000,
});
exports.io = io;
let dbInitialized = false;
let redisInitialized = false;
async function initializeServices() {
    try {
        logger.info('Initializing backend services...');
        await (0, database_1.initializeDatabase)();
        dbInitialized = true;
        logger.info('Database initialized successfully');
        await (0, redis_1.initializeRedis)();
        redisInitialized = true;
        logger.info('Redis cache initialized successfully');
        logger.info('All services initialized successfully');
    }
    catch (error) {
        logger.error('Failed to initialize services:', error);
        throw error;
    }
}
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP',
});
app.use('/api/', limiter);
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/health', async (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            database: dbInitialized,
            redis: redisInitialized,
        },
        environment: process.env.NODE_ENV || 'development',
        version: '0.1.0',
    };
    res.json(health);
});
app.use('/api/v1/auth', auth_1.default);
app.use('/api/v1/users', user_1.default);
app.use('/api/v1/matches', match_1.default);
app.use('/api/v1/betting', betting_1.default);
app.use('/api/v1/game', game_1.default);
app.use('/api/v1/ai', ai_1.default);
app.use('/api/v1/nft', nft_1.default);
io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    socket.on('join-match', (matchId) => {
        socket.join(`match:${matchId}`);
        logger.debug(`Socket ${socket.id} joined match room: ${matchId}`);
    });
    socket.on('leave-match', (matchId) => {
        socket.leave(`match:${matchId}`);
        logger.debug(`Socket ${socket.id} left match room: ${matchId}`);
    });
    socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
    });
});
app.use(errorHandler_1.errorHandler);
async function startServer() {
    try {
        await initializeServices();
        const PORT = process.env.PORT || 4002;
        server.listen(PORT, () => {
            logger.info(`Nen Platform POC Backend server running on port ${PORT}`, {
                environment: process.env.NODE_ENV || 'development',
                cors: process.env.CORS_ORIGIN || "http://localhost:3000",
                database: dbInitialized ? 'connected' : 'disconnected',
                redis: redisInitialized ? 'connected' : 'disconnected',
            });
        });
        process.on('SIGTERM', async () => {
            logger.info('SIGTERM received, shutting down gracefully');
            server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        });
    }
    catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server-simplified.js.map