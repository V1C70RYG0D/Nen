"use strict";
/**
 * WebSocket Server Setup for Real-time Notifications
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const config_1 = require("../config");
const database_1 = __importDefault(require("../models/database"));
const httpServer = (0, http_1.createServer)();
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: config_1.config.server.host,
        methods: ['GET', 'POST']
    }
});
io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error'));
    }
    const user = await database_1.default.getUserById(token);
    if (!user) {
        return next(new Error('User not found'));
    }
    socket.data.user = user;
    next();
});
io.on('connection', (socket) => {
    console.log(`User ${socket.data.user.id} connected`);
    socket.on('join', (room) => {
        socket.join(room);
        console.log(`User ${socket.data.user.id} joined room ${room}`);
    });
    socket.on('sendMessage', (room, message) => {
        io.to(room).emit('message', { user: socket.data.user.username, message });
    });
    socket.on('disconnect', () => {
        console.log(`User ${socket.data.user.id} disconnected`);
    });
});
exports.default = httpServer;
//# sourceMappingURL=notificationServer.js.map