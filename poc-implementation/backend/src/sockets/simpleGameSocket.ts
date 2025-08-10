/**
 * Simple Game Socket Setup
 * Simplified version for main server entry point
 */

import { Server as SocketIOServer } from 'socket.io';
import winston from 'winston';

export function setupSimpleGameSocket(io: SocketIOServer, logger: winston.Logger): void {
  const gameNamespace = io.of('/game');

  gameNamespace.on('connection', (socket) => {
    logger.info('Game client connected', {
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });

    // Basic game events
    socket.on('join-game', (gameId: string) => {
      socket.join(`game:${gameId}`);
      logger.debug(`Socket ${socket.id} joined game: ${gameId}`);
    });

    socket.on('leave-game', (gameId: string) => {
      socket.leave(`game:${gameId}`);
      logger.debug(`Socket ${socket.id} left game: ${gameId}`);
    });

    socket.on('game-move', (data: any) => {
      const gameId = data.gameId;
      socket.to(`game:${gameId}`).emit('move-update', data);
      logger.debug(`Move broadcasted in game: ${gameId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Game client disconnected: ${socket.id}`);
    });
  });

  // Main socket connection handler
  io.on('connection', (socket) => {
    logger.info('Client connected to main namespace', {
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });

    socket.on('ping', () => {
      socket.emit('pong');
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
}
