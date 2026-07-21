import { Server, Socket } from 'socket.io';
import { RoomManager } from './RoomManager.ts';

const roomManager = new RoomManager();

export function initializeSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Cliente conectado:', socket.id);

    socket.on('room:create', ({ hostName, game }, callback) => {
      const room = roomManager.createRoom(hostName, game, socket.id);

      socket.join(room.code);

      callback({
        success: true,
        room,
      });
    });

    socket.on('room:join', ({ roomCode, playerName }, callback) => {
      const room = roomManager.joinRoom(roomCode, playerName, socket.id);

      if (!room) {
        callback({
          success: false,
          error: 'Sala no encontrada',
        });
        return;
      }

      socket.join(room.code);

      io.to(roomCode).emit('room:update', room);

      callback({
        success: true,
        room,
      });
    });

    socket.on('disconnect', () => {
      roomManager.removePlayer(socket.id);
    });
  });
}

export { roomManager };
