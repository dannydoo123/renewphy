import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';

export const setupSocket = (io: SocketIOServer) => {
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    socket.on('join-room', (room: string) => {
      socket.join(room);
      logger.info(`Client ${socket.id} joined room: ${room}`);
    });

    socket.on('leave-room', (room: string) => {
      socket.leave(room);
      logger.info(`Client ${socket.id} left room: ${room}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
};

export const emitToRoom = (io: SocketIOServer, room: string, event: string, data: any) => {
  io.to(room).emit(event, data);
  logger.info(`Emitted ${event} to room ${room}:`, data);
};

export const emitToAll = (io: SocketIOServer, event: string, data: any) => {
  io.emit(event, data);
  logger.info(`Emitted ${event} to all clients:`, data);
};