import { Server, Socket } from 'socket.io';
import { RoomManager } from './RoomManager.ts';
import { createGameState } from './game/unstable-unicorns/setup.ts';
import { RulesEngine } from './game/unstable-unicorns/engine/RulesEngine.ts';
import { TurnManager } from './game/turn/TurnManager.ts';
import { TurnPhase } from './game/turn/TurnPhase.ts';

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
    socket.on(
      'play-card',
      ({
        roomCode,
        playerId,
        cardId,
      }: {
        roomCode: string;
        playerId: string;
        cardId: string;
      }) => {
        const room = roomManager.getRoom(roomCode);

        if (!room || !room.gameState) {
          return;
        }

        room.gameState = RulesEngine.playCard(room.gameState, playerId, cardId);

        io.to(roomCode).emit('game-updated', room.gameState);
      },
    );

    // Siguiente accion
    socket.on('next-phase', (roomCode: string) => {
      const room = roomManager.getRoom(roomCode);

      if (!room?.gameState) return;

      TurnManager.nextPhase(room.gameState);

      io.to(room.code).emit('game-updated', room.gameState);
    });

    // Resolver accion
    socket.on(
      'resolve-action',
      ({ roomCode, targetPlayerId, targetCardId }) => {
        const room = roomManager.getRoom(roomCode);

        if (!room?.gameState?.pendingAction) {
          return;
        }

        // Aqui todavia no se ejecuta nada
      },
    );

    // Terminar turno
    socket.on('end-turn', (roomCode: string) => {
      const room = roomManager.getRoom(roomCode);

      if (!room?.gameState) return;

      const game = room.gameState;

      if (game.phase !== TurnPhase.ACTION) return;

      // TurnManager.endTurn(game);

      io.to(room.code).emit('game-updated', game);
    });

    // Desconexión
    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`);
      roomManager.removePlayer(socket.id);
    });
  });
}

export { roomManager };
