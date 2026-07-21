import { Server, Socket } from 'socket.io';
import { RoomManager } from './RoomManager.ts';
import { createGameState } from './game/unstable-unicorns/setup.ts';

const roomManager = new RoomManager();

export function initializeSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    // Unirse a una sala
    socket.on('join-room', ({ roomCode, playerName }) => {
      const room = roomManager.joinRoom(roomCode, playerName, socket.id);

      if (!room) {
        socket.emit('error-message', 'Sala no encontrada');
        return;
      }

      socket.join(room.code);

      io.to(roomCode).emit('room-updated', room);
    });

    // Iniciar partida
    socket.on('start-game', (roomCode: string) => {
      console.log('Evento start-game recibido');
      console.log('Room:', roomCode);

      const room = roomManager.getRoom(roomCode);

      console.log('Sala encontrada:', room);

      if (!room) {
        console.log('Error: sala no encontrada');
        return;
      }

      const gameState = createGameState(room);

      room.gameState = gameState;

      io.to(room.code).emit('game-started', gameState);

      console.log(`Partida iniciada: ${room.code}`);
    });

    socket.on('room:create', ({ hostName, game }, callback) => {
      const room = roomManager.createRoom(hostName, game, socket.id);

      socket.join(room.code);

      callback({
        success: true,
        room,
      });
    });

    // Jugar carta
    socket.on('play-card', ({ roomCode, playerId, cardId }) => {
      const room = roomManager.getRoom(roomCode);

      if (!room || !room.gameState) return;

      const player = room.gameState.players.find((p) => p.id === playerId);

      if (!player) return;

      const index = player.hand.findIndex((c) => c.id === cardId);

      if (index === -1) return;

      const [card] = player.hand.splice(index, 1);

      player.stable.push(card);

      io.to(room.code).emit('game-updated', room.gameState);
    });

    // Desconexión
    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`);
      roomManager.removePlayer(socket.id);
    });
  });
}

export { roomManager };
