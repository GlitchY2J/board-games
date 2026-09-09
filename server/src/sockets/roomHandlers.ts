import crypto from 'crypto';
import type { GameServer, GameSocket } from './socketTypes.ts';
import { roomManager } from '../roomManagerInstance.ts';
import { createGameStateForPlayer, emitGameState } from './gameStateEmitter.ts';
import { addLog } from './gameLog.ts';
import { Room } from '../game/models/Room.ts';
import { Card } from '../game/models/Card.ts';
import { GameState } from '../game/models/GameState.ts';
import { createPublicRoom } from './publicRoom.ts';
import { isRoomFull, markPlayerAsSpectatorIfRoomIsFull } from '../roomCapacity.ts';
import { CardZoneMovement } from '../game/unstable-unicorns/engine/CardZoneMovement.ts';
import { roomService, RoomServiceError } from '../services/RoomService.ts';

function sendCardsOnLeave(game: GameState, cards: Card[]): void {
  for (const card of cards) {
    if (card.cardType === 'unicorn' && card.unicornClass === 'baby') {
      CardZoneMovement.returnToNursery(game, card);
    } else {
      CardZoneMovement.toDiscard(game, card);
    }
  }
}

function removePlayerFromGame(room: Room, playerId: string): boolean {
  const game = room.gameState;
  if (!game) return false;

  const gamePlayer = game.players.find((player) => player.id === playerId);
  if (!gamePlayer) return false;

  sendCardsOnLeave(game, gamePlayer.hand);
  sendCardsOnLeave(game, gamePlayer.stable);
  sendCardsOnLeave(game, gamePlayer.upgrades);
  sendCardsOnLeave(game, gamePlayer.downgrades);

  addLog(game, `${gamePlayer.name} salió de la partida`, {
    playerId: gamePlayer.id,
  });

  const index = game.players.findIndex((player) => player.id === gamePlayer.id);
  if (index !== -1) {
    if (game.winnerId === gamePlayer.id) {
      game.winnerName = gamePlayer.name;
    }
    game.players.splice(index, 1);
    if (game.players.length > 0) {
      game.currentPlayer = game.currentPlayer % game.players.length;
    }
  }

  if (game.pendingAction) {
    const pending = game.pendingAction;
    const belongsToPlayer =
      ('playerId' in pending && pending.playerId === gamePlayer.id) ||
      ('sourcePlayerId' in pending && pending.sourcePlayerId === gamePlayer.id);
    if (belongsToPlayer) {
      game.pendingAction = undefined;
    }
  }

  if (game.pendingPlay?.playerId === gamePlayer.id) {
    game.pendingPlay = undefined;
  }

  game.restartReadyPlayerIds = game.restartReadyPlayerIds?.filter(
    (id) => id !== gamePlayer.id,
  );
  game.eliminatedPlayers = game.eliminatedPlayers?.filter(
    (player) => player.id !== gamePlayer.id,
  );

  return true;
}

function shouldTerminateDummyOnlyGame(room: Room): boolean {
  const players = room.gameState?.players ?? [];
  return players.length > 0 && players.every((gamePlayer) => {
    const roomPlayer = room.players.find((candidate) => candidate.id === gamePlayer.id);
    return roomPlayer?.isDummy === true;
  });
}

function terminateIfOnePlayerRemains(io: GameServer, room: Room): boolean {
  const game = room.gameState;
  if (!game?.started || game.winnerId || game.players.length !== 1) return false;

  game.started = false;
  room.gameState = undefined;
  io.to(room.code).emit('game-terminated');
  return true;
}

export function registerRoomHandlers(io: GameServer, socket: GameSocket): void {
  socket.on('toggle-spectator', (roomCode) => {
    const room = roomManager.getRoom(roomCode);
    const player = room?.players.find((candidate) => candidate.socketId === socket.id);
    if (!room || !player || room.gameState?.started) return;
    if (player.isSpectator && isRoomFull(room)) return;

    player.isSpectator = !player.isSpectator;
    player.isReady = false;
    io.to(room.code).emit('room-updated', createPublicRoom(room));
  });

  socket.on('toggle-ready', (roomCode) => {
    const room = roomManager.getRoom(roomCode);
    const player = room?.players.find((candidate) => candidate.socketId === socket.id);
    if (!room || !player || room.gameState?.started || player.isSpectator || player.isDummy) return;

    player.isReady = !player.isReady;
    io.to(room.code).emit('room-updated', createPublicRoom(room));
  });

  socket.on('add-dummy-player', (roomCode) => {
    const room = roomManager.getRoom(roomCode);
    const host = room?.players.find((player) => player.socketId === socket.id);
    if (!room || !host || room.hostId !== host.id || room.gameState?.started) return;

    const dummyNumber = room.players.filter((player) => player.isDummy).length + 1;
    room.players.push({
      id: crypto.randomUUID(),
      sessionToken: crypto.randomUUID(),
      socketId: null,
      connected: true,
      name: `Dummy ${dummyNumber}`,
      avatar: ['fox', 'owl', 'cat', 'bear', 'wolf', 'bunny', 'koala'][dummyNumber - 1] ?? 'fox',
      hand: [],
      stable: [],
      upgrades: [],
      downgrades: [],
      isDummy: true,
    });
    io.to(room.code).emit('room-updated', createPublicRoom(room));
  });

  socket.on('remove-dummy-player', ({ roomCode, playerId }) => {
    const room = roomManager.getRoom(roomCode);
    const host = room?.players.find((player) => player.socketId === socket.id);
    if (!room || !host || room.hostId !== host.id || room.gameState?.started) return;

    room.players = room.players.filter((player) => !(player.id === playerId && player.isDummy));
    io.to(room.code).emit('room-updated', createPublicRoom(room));
  });

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
       io.to(existingRoom.code).emit('room-updated', createPublicRoom(existingRoom));
      return;
    }

    // El jugador nuevo se vincula a la sala mediante su sesión después del join.
    console.log(`[join-room] Jugador nuevo: ${playerName}. Registrando en roomManager...`);
    let room;
    try {
      room = roomService.joinRoom(roomCode, playerName, avatar).room;
    } catch (error) {
      if (!(error instanceof RoomServiceError)) throw error;
      console.log(`[join-room] Error al registrar al jugador nuevo en roomManager`);
      socket.emit('game-error', {
        code: error.code,
        message: error.message,
        action: 'unknown',
      });
      return;
    }

    const joinedPlayer = room.players[room.players.length - 1];
    if (joinedPlayer) {
      joinedPlayer.socketId = socket.id;
      joinedPlayer.connected = true;
    }

    socket.join(room.code);
    console.log(`[join-room] Sockets en la sala ${room.code} tras el join:`);
    io.to(room.code).emit('room-updated', createPublicRoom(room));
  });



  socket.on('leave-room', ({ roomCode }) => {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    const game = room.gameState;
    const leavingId = room.players.find((p) => p.socketId === socket.id)?.id;
    if (game) {
      if (leavingId) removePlayerFromGame(room, leavingId);
    }

    roomManager.removePlayer(socket.id);

    const updatedRoom = roomManager.getRoom(roomCode);

    if (!updatedRoom) {
      // La sala se eliminó (sin jugadores restantes)
      return;
    }

    const terminated = terminateIfOnePlayerRemains(io, updatedRoom);
    if (!terminated && room.hostId === leavingId && shouldTerminateDummyOnlyGame(updatedRoom)) {
      updatedRoom.gameState = undefined;
      io.to(roomCode).emit('game-terminated');
    }

    socket.leave(roomCode);
    io.to(roomCode).emit('room-updated', createPublicRoom(updatedRoom));

    if (game && updatedRoom.gameState) {
      emitGameState(io, updatedRoom, 'game-updated');
    }
  });

  socket.on('leave-game', ({ roomCode }) => {
    const room = roomManager.getRoom(roomCode);
    if (!room?.gameState) return;

    const player = room.players.find((candidate) => candidate.socketId === socket.id);
    if (!player) return;

    player.isReady = false;

    // Los jugadores eliminados ya no están en gameState.players, pero siguen
    // siendo miembros de la sala y deben poder salir desde el Winner Screen.
    if (!player.isSpectator) {
      room.gameState.restartReadyPlayerIds = room.gameState.restartReadyPlayerIds?.filter(
        (id) => id !== player.id,
      );
      room.gameState.eliminatedPlayers = room.gameState.eliminatedPlayers?.filter(
        (candidate) => candidate.id !== player.id,
      );
      removePlayerFromGame(room, player.id);
    }

    const terminated = terminateIfOnePlayerRemains(io, room);
    if (!terminated && player.id === room.hostId && shouldTerminateDummyOnlyGame(room)) {
      room.gameState = undefined;
      io.to(room.code).emit('game-terminated');
    }

    if (room.gameState?.players.length === 0 && !room.gameState.winnerId) {
      room.gameState = undefined;
    }

    // Keep the player in the room: leaving the finished game means returning
    // to the lobby, where the same id and avatar must remain assigned.
    io.to(room.code).emit('room-updated', createPublicRoom(room));
    if (room.gameState) {
      emitGameState(io, room, 'game-updated');
    }
  });

  socket.on('kick-player', ({ roomCode, playerId }) => {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    const host = room.players.find((player) => player.socketId === socket.id);
    const target = room.players.find((player) => player.id === playerId);
    if (!host || host.id !== room.hostId || !target || target.id === host.id) return;

    const targetSocket = target.socketId
      ? io.sockets.sockets.get(target.socketId)
      : undefined;
    const game = room.gameState;
    if (game) removePlayerFromGame(room, target.id);

    roomManager.removePlayer(target.socketId ?? '', target.id);
    targetSocket?.leave(room.code);
    targetSocket?.emit('kicked-from-room', { message: 'Has sido expulsado de la sala.' });

    const updatedRoom = roomManager.getRoom(roomCode);
    if (!updatedRoom) return;
    terminateIfOnePlayerRemains(io, updatedRoom);
    io.to(room.code).emit('room-updated', createPublicRoom(updatedRoom));
    if (game && updatedRoom.gameState) {
      emitGameState(io, updatedRoom, 'game-updated');
    }
  });

  socket.on('transfer-host', ({ roomCode, playerId }) => {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    const host = room.players.find((player) => player.socketId === socket.id);
    const target = room.players.find((player) => player.id === playerId);
    if (!host || host.id !== room.hostId || !target || target.id === host.id) return;

    host.isReady = false;
    room.hostId = target.id;
    target.isReady = false;
    io.to(room.code).emit('room-updated', createPublicRoom(room));
  });

  socket.on('room:create', ({ hostName, game, avatar }, callback) => {
    const { room, player } = roomService.createRoom(hostName, avatar);
    if (game) {
      room.settings.gameId = game;
    }
    player.socketId = socket.id;

    socket.join(room.code);

    callback({
      success: true,
      room: createPublicRoom(room),
    });
  });

  socket.on('resume-session', ({ roomCode, sessionToken }, callback) => {
    let player;
    try {
      player = roomService.resumeSession(roomCode, sessionToken, socket.id);
    } catch (error) {
      callback({
        success: false,
        error: error instanceof RoomServiceError ? error.message : 'No se pudo recuperar la sesión.',
      });
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
      room: createPublicRoom(room),
      gameState: room.gameState
        ? createGameStateForPlayer(room.gameState, player.id)
        : undefined,
    });

    io.to(room.code).emit('room-updated', createPublicRoom(room));

    if (room.gameState) {
      emitGameState(io, room, 'game-updated');
    }

    console.log(`Sesión recuperada: ${player.name} (${socket.id})`);
  });

  socket.on('toggle-expansion', ({ roomCode, expansionId }) => {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    // Solo el host puede cambiar expansiones
    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player || player.id !== room.hostId) return;

    // No permitir cambiar si el juego ya inició
    if (room.gameState?.started) return;

    const updatedRoom = roomManager.toggleExpansion(roomCode, expansionId);
    if (updatedRoom) {
      io.to(updatedRoom.code).emit('room-updated', createPublicRoom(updatedRoom));
    }
  });

  socket.on('update-room-settings', ({ roomCode, settings }) => {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    const player = room.players.find((candidate) => candidate.socketId === socket.id);
    if (!player) return;

    let updatedRoom;
    try {
      updatedRoom = roomService.updateSettings(roomCode, player.id, settings);
    } catch (error) {
      if (!(error instanceof RoomServiceError)) throw error;
      socket.emit('game-error', {
        code: error.code,
        message: error.message,
        action: 'update-room-settings',
      });
      return;
    }

    io.to(updatedRoom.code).emit('room-updated', createPublicRoom(updatedRoom));
  });
}
