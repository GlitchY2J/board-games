import { Server, Socket } from 'socket.io';
import { RoomManager } from './RoomManager.ts';
import { createGameState } from './game/unstable-unicorns/setup.ts';
import { RulesEngine } from './game/unstable-unicorns/engine/RulesEngine.ts';
import { TurnManager } from './game/turn/TurnManager.ts';
import { TurnPhase } from './game/turn/TurnPhase.ts';
import { ActionResolver } from './game/unstable-unicorns/engine/ActionResolver.ts';

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
      const room = roomManager.getRoom(roomCode);

      if (!room) {
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
        if (!room || !room.gameState) return;

        room.gameState = RulesEngine.playCard(room.gameState, playerId, cardId);
        io.to(roomCode).emit('game-updated', room.gameState);
      },
    );

    // Draw Action Card
    socket.on(
      'draw-action-card',
      ({ roomCode, playerId }: { roomCode: string; playerId: string }) => {
        const room = roomManager.getRoom(roomCode);
        if (!room?.gameState) return;

        const game = room.gameState;
        if (game.phase !== TurnPhase.ACTION || game.actionUsed) return;

        const player = game.players.find((p) => p.id === playerId);
        if (!player) return;

        const card = game.deck.shift();
        if (!card) return;

        player.hand.push(card);
        game.actionUsed = true;

        io.to(room.code).emit('game-updated', game);
      },
    );

    // Descartar cartas
    socket.on(
      'discard-cards',
      ({
        roomCode,
        playerId,
        cardIds,
      }: {
        roomCode: string;
        playerId: string;
        cardIds: string[];
      }) => {
        const room = roomManager.getRoom(roomCode);
        if (!room?.gameState) return;

        let resolved = false;
        if (room.gameState.pendingAction?.type === 'mystical_vortex') {
          resolved = ActionResolver.handleMysticalVortexDiscard(
            room.gameState,
            playerId,
            cardIds,
          );
        } else {
          resolved = ActionResolver.handleDiscard(
            room.gameState,
            playerId,
            cardIds,
          );
        }

        if (resolved) {
          io.to(room.code).emit('game-updated', room.gameState);
        }
      },
    );

    // Seleccionar jugador objetivo
    socket.on(
      'select-player',
      ({
        roomCode,
        targetPlayerId,
      }: {
        roomCode: string;
        targetPlayerId: string;
      }) => {
        const room = roomManager.getRoom(roomCode);
        if (!room?.gameState) return;

        const sourcePlayer = room.gameState.players.find(
          (p) => p.socketId === socket.id,
        );
        if (!sourcePlayer) return;

        const resolved = ActionResolver.handleSelectPlayer(
          room.gameState,
          sourcePlayer.id,
          targetPlayerId,
        );

        if (resolved) {
          io.to(room.code).emit('game-updated', room.gameState);
        }
      },
    );

    // Seleccionar carta del establo
    socket.on(
      'select-stable-card',
      ({ roomCode, cardId }: { roomCode: string; cardId: string }) => {
        const room = roomManager.getRoom(roomCode);
        if (!room?.gameState) return;

        const sourcePlayer = room.gameState.players.find(
          (p) => p.socketId === socket.id,
        );
        if (!sourcePlayer) return;

        const resolved = ActionResolver.handleSelectStableCard(
          room.gameState,
          sourcePlayer.id,
          cardId,
        );

        if (resolved) {
          io.to(room.code).emit('game-updated', room.gameState);
        }
      },
    );

    // Seleccionar carta de la mano de un rival
    socket.on(
      'select-hand-card',
      ({ roomCode, cardId }: { roomCode: string; cardId: string }) => {
        const room = roomManager.getRoom(roomCode);
        if (!room?.gameState) return;

        const sourcePlayer = room.gameState.players.find(
          (p) => p.socketId === socket.id,
        );
        if (!sourcePlayer) return;

        const resolved = ActionResolver.handleSelectHandCard(
          room.gameState,
          sourcePlayer.id,
          cardId,
        );

        if (resolved) {
          io.to(room.code).emit('game-updated', room.gameState);
        }
      },
    );

    // Siguiente fase
    socket.on('next-phase', (roomCode: string) => {
      const room = roomManager.getRoom(roomCode);
      if (!room?.gameState) return;

      TurnManager.nextPhase(room.gameState);
      io.to(room.code).emit('game-updated', room.gameState);
    });

    // Terminar turno
    socket.on('end-turn', (roomCode: string) => {
      const room = roomManager.getRoom(roomCode);
      if (!room?.gameState) return;

      const game = room.gameState;
      if (game.phase !== TurnPhase.ACTION) return;

      TurnManager.nextPhase(game); // Pasa a END
      io.to(room.code).emit('game-updated', game);
    });

    // Reiniciar juego
    socket.on('restart-game', (roomCode: string) => {
      const room = roomManager.getRoom(roomCode);
      if (!room) return;

      room.gameState = createGameState(room);
      room.gameState.pendingAction = undefined;
      room.gameState.winnerId = undefined;
      room.gameState.actionUsed = false;

      io.to(room.code).emit('game-updated', room.gameState);
      console.log(`Partida reiniciada: ${roomCode}`);
    });

    // Cancelar acción pendiente (para efectos opcionales)
    socket.on('cancel-action', ({ roomCode }: { roomCode: string }) => {
      const room = roomManager.getRoom(roomCode);
      if (!room?.gameState) return;

      room.gameState.pendingAction = undefined;
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
