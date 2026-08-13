import type { GameServer, GameSocket } from './socketTypes.ts';
import { roomManager } from '../roomManagerInstance.ts';
import { emitGameState } from './gameStateEmitter.ts';
import { addLog } from './gameLog.ts';
import { Room } from '../game/models/Room.ts';
import { Player } from '../game/models/Player.ts';
import { Card } from '../game/models/Card.ts';
import { GameState } from '../game/models/GameState.ts';

function sendCardsOnLeave(game: GameState, cards: Card[]): void {
  for (const card of cards) {
    if (card.cardType === 'unicorn' && card.unicornClass === 'baby') {
      game.nursery.push(card);
    } else {
      game.discard.push(card);
    }
  }
}

function createPublicRoom(room: Room): Room {
  return {
    ...room,
    players: room.players.map((player) => {
      const { sessionToken: _sessionToken, ...publicPlayer } = player;

      return publicPlayer as Player;
    }),
  };
}

export function registerRoomHandlers(io: GameServer, socket: GameSocket): void {
  socket.on('join-room', ({ roomCode, playerName, avatar }) => {
    console.log(`[join-room] Petición recibida de socket ${socket.id} para unirse a la sala ${roomCode} con nombre ${playerName}`);
    const existingRoom = roomManager.getRoom(roomCode);

    if (!existingRoom) {
      console.log(`[join-room] Sala no encontrada: ${roomCode}`);
      socket.emit('game-error', {
        code: 'ROOM_NOT_FOUND',
        message: 'Sala no encontrada.',
        action: 'unknown',
      });
      return;
    }

    // 1. Ya está en la sala con este mismo socket → no hacer nada
    const bySocketId = existingRoom.players.find(
      (player) => player.socketId === socket.id,
    );

    if (bySocketId) {
      console.log(`[join-room] Encontrado por socketId: ${socket.id}. Uniendo al canal y emitiendo room-updated`);
      socket.join(existingRoom.code);
      console.log(`[join-room] Salas actuales del socket ${socket.id}:`, Array.from(socket.rooms));
      io.to(existingRoom.code).emit('room-updated', existingRoom);
      return;
    }

    // 2. Existe un jugador con el mismo nombre (host que creó la sala via HTTP
    //    con un socketId diferente al WebSocket actual) → actualizar socketId
    const byName = existingRoom.players.find(
      (player) => player.name === playerName,
    );

    if (byName) {
      console.log(`[join-room] Encontrado por nombre: ${playerName}. Actualizando socketId de ${byName.socketId} a ${socket.id}`);
      byName.socketId = socket.id;
      byName.connected = true;
      socket.join(existingRoom.code);
      console.log(`[join-room] Salas actuales del socket ${socket.id}:`, Array.from(socket.rooms));
      io.to(existingRoom.code).emit('room-updated', existingRoom);
      return;
    }

    // 3. Jugador nuevo → unirlo a la sala
    console.log(`[join-room] Jugador nuevo: ${playerName}. Registrando en roomManager...`);
    const room = roomManager.joinRoom(roomCode, playerName, socket.id, avatar);

    if (!room) {
      console.log(`[join-room] Error al registrar al jugador nuevo en roomManager`);
      socket.emit('game-error', {
        code: 'ROOM_NOT_FOUND',
        message: 'Sala no encontrada.',
        action: 'unknown',
      });
      return;
    }

    socket.join(room.code);
    console.log(`[join-room] Sockets en la sala ${room.code} tras el join:`);
    io.to(room.code).emit('room-updated', room);
  });



  socket.on('leave-room', ({ roomCode }) => {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    // Si hay una partida en curso, eliminar al jugador del juego:
    // sus cartas (mano, establo, upgrades, downgrades) van al descarte.
    const game = room.gameState;
    if (game) {
      const leavingId = room.players.find((p) => p.socketId === socket.id)?.id;

      const gamePlayer = leavingId
        ? game.players.find((p) => p.id === leavingId)
        : undefined;

      if (gamePlayer) {
        sendCardsOnLeave(game, gamePlayer.hand);
        sendCardsOnLeave(game, gamePlayer.stable);
        sendCardsOnLeave(game, gamePlayer.upgrades);
        sendCardsOnLeave(game, gamePlayer.downgrades);

        addLog(
          game,
          `${gamePlayer.name} salió de la partida`,
          { playerId: gamePlayer.id },
        );

        const index = game.players.findIndex((p) => p.id === gamePlayer.id);
        if (index !== -1) {
          game.players.splice(index, 1);
        }

        if (game.players.length > 0) {
          game.currentPlayer = game.currentPlayer % game.players.length;
        }
      }

      // Limpiar referencias del jugador en acciones pendientes
      if (game.pendingAction) {
        const pending = game.pendingAction as any;
        if (
          pending.playerId === gamePlayer?.id ||
          pending.sourcePlayerId === gamePlayer?.id
        ) {
          game.pendingAction = undefined;
        }
      }
      if (game.pendingPlay?.playerId === gamePlayer?.id) {
        game.pendingPlay = undefined;
      }
    }

    roomManager.removePlayer(socket.id);

    const updatedRoom = roomManager.getRoom(roomCode);

    if (!updatedRoom) {
      // La sala se eliminó (sin jugadores restantes)
      return;
    }

    socket.leave(roomCode);
    io.to(roomCode).emit('room-updated', updatedRoom);

    if (game) {
      emitGameState(io, updatedRoom, 'game-updated');
    }
  });

  socket.on('room:create', ({ hostName, game, avatar }, callback) => {
    const room = roomManager.createRoom(hostName, game, socket.id, avatar);

    socket.join(room.code);

    callback({
      success: true,
      room,
    });
  });

  socket.on('resume-session', ({ roomCode, sessionToken }, callback) => {
    const player = roomManager.resumePlayerSession(
      roomCode,
      sessionToken,
      socket.id,
    );

    if (!player) {
      callback({ success: false, error: 'No se pudo recuperar la sesión.' });
      return;
    }

    const room = roomManager.getRoom(roomCode);

    if (!room) {
      callback({ success: false, error: 'La sala ya no existe.' });
      return;
    }

    socket.join(room.code);

    callback({
      success: true,
      playerId: player.id,
      room,
      gameState: room.gameState,
    });

    io.to(room.code).emit('room-updated', room);

    if (room.gameState) {
      emitGameState(io, room, 'game-updated');
    }

    console.log(`Sesión recuperada: ${player.name} (${socket.id})`);
  });
}
