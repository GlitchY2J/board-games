import { Server, Socket } from 'socket.io';
import { roomManager } from './index.ts';
import { GameManager } from './game/GameManager.ts';

export function registerSocketEvents(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    socket.on('join-room', ({ roomCode, playerName }) => {
      const room = roomManager.getRoom(roomCode);
    });
  });
}
