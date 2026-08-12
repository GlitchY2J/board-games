import type { GameServer, GameSocket } from './socketTypes.ts';
import { roomManager } from '../roomManagerInstance.ts';
import { emitGameState } from './gameStateEmitter.ts';
import { Room } from '../game/models/Room.ts';
import { Player } from '../game/models/Player.ts';

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
  socket.on('join-room', ({ roomCode, playerName }) => {
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
    const room = roomManager.joinRoom(roomCode, playerName, socket.id);

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

    roomManager.removePlayer(socket.id);

    const updatedRoom = roomManager.getRoom(roomCode);

    if (updatedRoom) {
      socket.leave(roomCode);
      io.to(roomCode).emit('room-updated', updatedRoom);
    }
  });

  socket.on('room:create', ({ hostName, game }, callback) => {
    const room = roomManager.createRoom(hostName, game, socket.id);

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
