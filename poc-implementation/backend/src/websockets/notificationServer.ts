/**
 * WebSocket Server Setup for Real-time Notifications
 */

import { Server } from 'socket.io';
import { createServer } from 'http';
import { config } from '../config';
import { authMiddleware } from '../middleware/auth';
import db from '../models/database';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: config.server.host,
    methods: ['GET', 'POST'],
  }
});

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  const user = await db.getUserById(token);
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

export default httpServer;
