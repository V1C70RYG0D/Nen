"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.websocketManager = void 0;
const express_1 = __importDefault(require("express"));
const logger_1 = require("../utils/logger");
const database_1 = require("../config/database");
const redis_1 = require("../config/redis");
const router = express_1.default.Router();
const db = (0, database_1.getDatabase)();
const redis = (0, redis_1.getRedisClient)();
// WebSocket event handlers and utilities
class WebSocketManager {
    constructor() {
        this.io = null;
        this.connections = new Map();
    }
    initialize(io) {
        this.io = io;
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        if (!this.io)
            return;
        this.io.on('connection', (socket) => {
            logger_1.logger.info('Client connected', { socketId: socket.id });
            this.connections.set(socket.id, {
                id: socket.id,
                connectedAt: new Date(),
                userId: null,
                rooms: new Set()
            });
            // Authentication
            socket.on('authenticate', async (data) => {
                try {
                    const { userId, token } = data;
                    // TODO: Implement proper token validation
                    if (userId && token) {
                        socket.userId = userId;
                        this.connections.set(socket.id, {
                            ...this.connections.get(socket.id),
                            userId
                        });
                        // Join user-specific room
                        await socket.join(`user:${userId}`);
                        socket.emit('authenticated', { success: true, userId });
                        logger_1.logger.info('User authenticated', { socketId: socket.id, userId });
                    }
                    else {
                        socket.emit('authenticated', { success: false, error: 'Invalid credentials' });
                    }
                }
                catch (error) {
                    logger_1.logger.error('Authentication error:', error);
                    socket.emit('authenticated', { success: false, error: 'Authentication failed' });
                }
            });
            // Join game room
            socket.on('join-game', async (data) => {
                try {
                    const { gameId, userId } = data;
                    if (!socket.userId) {
                        socket.emit('error', { message: 'Not authenticated' });
                        return;
                    }
                    await socket.join(`game:${gameId}`);
                    this.connections.get(socket.id)?.rooms.add(`game:${gameId}`);
                    socket.emit('joined-game', { gameId, userId });
                    socket.to(`game:${gameId}`).emit('player-joined', { userId, socketId: socket.id });
                    logger_1.logger.info('User joined game', { socketId: socket.id, gameId, userId });
                }
                catch (error) {
                    logger_1.logger.error('Join game error:', error);
                    socket.emit('error', { message: 'Failed to join game' });
                }
            });
            // Leave game room
            socket.on('leave-game', async (data) => {
                try {
                    const { gameId, userId } = data;
                    await socket.leave(`game:${gameId}`);
                    this.connections.get(socket.id)?.rooms.delete(`game:${gameId}`);
                    socket.emit('left-game', { gameId, userId });
                    socket.to(`game:${gameId}`).emit('player-left', { userId, socketId: socket.id });
                    logger_1.logger.info('User left game', { socketId: socket.id, gameId, userId });
                }
                catch (error) {
                    logger_1.logger.error('Leave game error:', error);
                    socket.emit('error', { message: 'Failed to leave game' });
                }
            });
            // Handle game moves
            socket.on('game-move', async (data) => {
                try {
                    const { gameId, move, userId } = data;
                    if (!socket.userId) {
                        socket.emit('error', { message: 'Not authenticated' });
                        return;
                    }
                    // Validate move (basic validation)
                    if (!gameId || !move || !userId) {
                        socket.emit('error', { message: 'Invalid move data' });
                        return;
                    }
                    // Broadcast move to all players in the game
                    socket.to(`game:${gameId}`).emit('move-made', {
                        gameId,
                        move,
                        userId,
                        timestamp: new Date().toISOString()
                    });
                    // Acknowledge move to sender
                    socket.emit('move-acknowledged', {
                        gameId,
                        move,
                        timestamp: new Date().toISOString()
                    });
                    logger_1.logger.info('Game move processed', { socketId: socket.id, gameId, userId, move });
                }
                catch (error) {
                    logger_1.logger.error('Game move error:', error);
                    socket.emit('error', { message: 'Failed to process move' });
                }
            });
            // Handle chat messages
            socket.on('chat-message', async (data) => {
                try {
                    const { gameId, message, userId } = data;
                    if (!socket.userId) {
                        socket.emit('error', { message: 'Not authenticated' });
                        return;
                    }
                    const chatMessage = {
                        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        gameId,
                        message,
                        userId,
                        timestamp: new Date().toISOString()
                    };
                    // Store message in Redis for history
                    await redis.lpush(`chat:${gameId}`, chatMessage);
                    await redis.expire(`chat:${gameId}`, 86400); // Expire after 24 hours
                    // Broadcast message to all players in the game
                    this.io?.to(`game:${gameId}`).emit('chat-message', chatMessage);
                    logger_1.logger.info('Chat message sent', { socketId: socket.id, gameId, userId });
                }
                catch (error) {
                    logger_1.logger.error('Chat message error:', error);
                    socket.emit('error', { message: 'Failed to send message' });
                }
            });
            // Handle betting events
            socket.on('place-bet', async (data) => {
                try {
                    const { gameId, amount, betType, userId } = data;
                    if (!socket.userId) {
                        socket.emit('error', { message: 'Not authenticated' });
                        return;
                    }
                    const bet = {
                        id: `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        gameId,
                        amount,
                        betType,
                        userId,
                        timestamp: new Date().toISOString(),
                        status: 'pending'
                    };
                    // Store bet in Redis for processing
                    await redis.lpush(`bets:${gameId}`, bet);
                    // Notify all players about the new bet
                    socket.to(`game:${gameId}`).emit('bet-placed', bet);
                    socket.emit('bet-acknowledged', bet);
                    logger_1.logger.info('Bet placed', { socketId: socket.id, gameId, userId, amount, betType });
                }
                catch (error) {
                    logger_1.logger.error('Bet placement error:', error);
                    socket.emit('error', { message: 'Failed to place bet' });
                }
            });
            // Handle real-time game updates
            socket.on('game-update', async (data) => {
                try {
                    const { gameId, update, userId } = data;
                    if (!socket.userId) {
                        socket.emit('error', { message: 'Not authenticated' });
                        return;
                    }
                    const gameUpdate = {
                        gameId,
                        update,
                        userId,
                        timestamp: new Date().toISOString()
                    };
                    // Broadcast update to all players in the game
                    socket.to(`game:${gameId}`).emit('game-update', gameUpdate);
                    logger_1.logger.info('Game update sent', { socketId: socket.id, gameId, userId });
                }
                catch (error) {
                    logger_1.logger.error('Game update error:', error);
                    socket.emit('error', { message: 'Failed to send update' });
                }
            });
            // Handle heartbeat
            socket.on('heartbeat', () => {
                socket.emit('heartbeat-ack', { timestamp: new Date().toISOString() });
            });
            // Handle disconnection
            socket.on('disconnect', (reason) => {
                logger_1.logger.info('Client disconnected', { socketId: socket.id, reason });
                const connection = this.connections.get(socket.id);
                if (connection) {
                    // Notify all rooms about user disconnect
                    connection.rooms.forEach((room) => {
                        socket.to(room).emit('user-disconnected', {
                            userId: connection.userId,
                            socketId: socket.id
                        });
                    });
                }
                this.connections.delete(socket.id);
            });
            // Error handling
            socket.on('error', (error) => {
                logger_1.logger.error('Socket error:', { socketId: socket.id, error });
            });
        });
    }
    // Utility methods
    broadcast(event, data, room) {
        if (!this.io)
            return;
        if (room) {
            this.io.to(room).emit(event, data);
        }
        else {
            this.io.emit(event, data);
        }
    }
    getConnectionCount() {
        return this.connections.size;
    }
    getConnections() {
        return Array.from(this.connections.values());
    }
    getRoomCount(room) {
        if (!this.io)
            return 0;
        const roomSockets = this.io.sockets.adapter.rooms.get(room);
        return roomSockets ? roomSockets.size : 0;
    }
}
// Export singleton instance
exports.websocketManager = new WebSocketManager();
/**
 * @swagger
 * components:
 *   schemas:
 *     WebSocketStats:
 *       type: object
 *       properties:
 *         connections:
 *           type: number
 *         rooms:
 *           type: object
 *         uptime:
 *           type: number
 */
/**
 * @swagger
 * /api/websocket/stats:
 *   get:
 *     summary: Get WebSocket connection statistics
 *     tags: [WebSocket]
 *     responses:
 *       200:
 *         description: WebSocket statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebSocketStats'
 *       500:
 *         description: Server error
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = {
            connections: exports.websocketManager.getConnectionCount(),
            connectedUsers: exports.websocketManager.getConnections(),
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
        res.json(stats);
        logger_1.logger.info('WebSocket stats requested');
    }
    catch (error) {
        logger_1.logger.error('Error getting WebSocket stats:', error);
        res.status(500).json({ error: 'Failed to get WebSocket statistics' });
    }
});
/**
 * @swagger
 * /api/websocket/broadcast:
 *   post:
 *     summary: Broadcast a message to all connected clients
 *     tags: [WebSocket]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event
 *               - data
 *             properties:
 *               event:
 *                 type: string
 *                 description: The event name
 *               data:
 *                 type: object
 *                 description: The data to broadcast
 *               room:
 *                 type: string
 *                 description: Optional room to broadcast to
 *     responses:
 *       200:
 *         description: Message broadcasted successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/broadcast', async (req, res) => {
    try {
        const { event, data, room } = req.body;
        if (!event || !data) {
            return res.status(400).json({ error: 'Event and data are required' });
        }
        exports.websocketManager.broadcast(event, data, room);
        const result = {
            success: true,
            event,
            room: room || 'all',
            timestamp: new Date().toISOString()
        };
        res.json(result);
        logger_1.logger.info('Message broadcasted', { event, room: room || 'all' });
    }
    catch (error) {
        logger_1.logger.error('Error broadcasting message:', error);
        res.status(500).json({ error: 'Failed to broadcast message' });
    }
});
/**
 * @swagger
 * /api/websocket/room/{roomId}/stats:
 *   get:
 *     summary: Get statistics for a specific room
 *     tags: [WebSocket]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: The room ID
 *     responses:
 *       200:
 *         description: Room statistics retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/room/:roomId/stats', async (req, res) => {
    try {
        const { roomId } = req.params;
        const stats = {
            roomId,
            connectionCount: exports.websocketManager.getRoomCount(roomId),
            timestamp: new Date().toISOString()
        };
        res.json(stats);
        logger_1.logger.info('Room stats requested', { roomId });
    }
    catch (error) {
        logger_1.logger.error('Error getting room stats:', error);
        res.status(500).json({ error: 'Failed to get room statistics' });
    }
});
/**
 * @swagger
 * /api/websocket/chat/{gameId}/history:
 *   get:
 *     summary: Get chat history for a game
 *     tags: [WebSocket]
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *         description: The game ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of messages to retrieve
 *     responses:
 *       200:
 *         description: Chat history retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/chat/:gameId/history', async (req, res) => {
    try {
        const { gameId } = req.params;
        const { limit = 50 } = req.query;
        const messageLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
        const messages = await redis.getClient().lrange(`chat:${gameId}`, 0, messageLimit - 1);
        const parsedMessages = messages.map((msg) => {
            try {
                return JSON.parse(msg);
            }
            catch {
                return { message: msg, timestamp: new Date().toISOString() };
            }
        });
        res.json({
            gameId,
            messages: parsedMessages.reverse(), // Reverse to get chronological order
            count: parsedMessages.length
        });
        logger_1.logger.info('Chat history retrieved', { gameId, count: parsedMessages.length });
    }
    catch (error) {
        logger_1.logger.error('Error getting chat history:', error);
        res.status(500).json({ error: 'Failed to get chat history' });
    }
});
/**
 * @swagger
 * /api/websocket/health:
 *   get:
 *     summary: Health check for WebSocket service
 *     tags: [WebSocket]
 *     responses:
 *       200:
 *         description: WebSocket service is healthy
 *       503:
 *         description: WebSocket service is unhealthy
 */
router.get('/health', async (req, res) => {
    try {
        const stats = {
            status: 'healthy',
            connections: exports.websocketManager.getConnectionCount(),
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
        res.json(stats);
    }
    catch (error) {
        logger_1.logger.error('WebSocket health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
// Error handling middleware for websocket routes
router.use((error, req, res, next) => {
    logger_1.logger.error('WebSocket route error:', error);
    res.status(500).json({
        error: 'WebSocket service error',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});
exports.default = router;
//# sourceMappingURL=websocket.js.map