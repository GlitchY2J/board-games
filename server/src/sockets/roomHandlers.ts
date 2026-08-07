import type { Socket, Server } from 'socket.io';

import { roomManager } from '../roomManagerInstance.ts';

export function registerRoomHandlers(io: Server, socket: Socket): void {
  socket.on(
    'join-room',
    ({ roomCode, playerName }: { roomCode: string; playerName: string }) => {
      const existingRoom = roomManager.getRoom(roomCode);

      if (!existingRoom) {
        socket.emit('game-error', {
          code: 'ROOM_NOT_FOUND',
          message: 'Sala no encontrada.',
          action: 'unknown',
        });
        return;
      }

      // Si este socket ya pertenece a la sala,
      // no volvemos a crear al jugador
      const existingPlayer = existingRoom.players.find(
        (player) => player.socketId === socket.id,
      );

      const room = existingPlayer
        ? existingRoom
        : roomManager.joinRoom(roomCode, playerName, socket.id);

      if (!room) {
        socket.emit('game-error', {
          code: 'ROOM_NOT_FOUND',
          message: 'Sala no encontrada.',
          action: 'unknown',
        });
        return;
      }

      socket.join(room.code);

      io.to(room.code).emit('room-updated', room);
    },
  );

  socket.on(
    'room:create',
    ({ hostName, game }: { hostName: string; game: string }, callback) => {
      const room = roomManager.createRoom(hostName, game, socket.id);

      socket.join(room.code);

      callback({
        success: true,
        room,
      });
    },
  );
}
