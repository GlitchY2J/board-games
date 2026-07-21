import { Server } from 'socket.io';
import { RoomManager } from './RoomManager.ts';

const roomManager = new RoomManager();

export function initializeSocket(io: Server) {
  io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    socket.on('join-room', ({ roomCode, playerName }) => {
      socket.join(roomCode);

      const room = roomManager.joinRoom(roomCode, playerName, socket.id);

      if (!room) return;

      io.to(roomCode).emit('room-updated', room);
    });

    socket.on('disconnect', () => {
      roomManager.removePlayer(socket.id);
    });
  });
}

export { roomManager };
