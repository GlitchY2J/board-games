import type { RoomSettings } from '../../../shared/types/GameDefinition.ts';
import type { Player } from '../game/models/Player.ts';
import type { Room } from '../game/models/Room.ts';
import { gameRegistry } from '../games/catalog.ts';
import { markPlayerAsSpectatorIfRoomIsFull } from '../roomCapacity.ts';
import { roomManager } from '../roomManagerInstance.ts';

export type RoomServiceErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'PLAYER_NOT_IN_ROOM'
  | 'NOT_HOST'
  | 'ROOM_ALREADY_STARTED'
  | 'INVALID_ROOM_SETTINGS'
  | 'GAME_NOT_AVAILABLE';

export class RoomServiceError extends Error {
  constructor(
    readonly code: RoomServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RoomServiceError';
  }
}

export class RoomService {
  createRoom(hostName: string, avatar?: string): { room: Room; player: Player } {
    const room = roomManager.createRoom(hostName, null, null, avatar);
    const player = room.players[0];
    if (!player) throw new Error('La sala se creó sin anfitrión.');
    return { room, player };
  }

  joinRoom(
    roomCode: string,
    playerName: string,
    avatar?: string,
  ): { room: Room; player: Player } {
    const room = roomManager.joinRoom(roomCode.toUpperCase(), playerName, null, avatar);
    if (!room) {
      throw new RoomServiceError('ROOM_NOT_FOUND', 'Sala no encontrada.');
    }

    const player = room.players[room.players.length - 1];
    if (!player) throw new Error('La sala no tiene jugadores.');
    markPlayerAsSpectatorIfRoomIsFull(room, player.id);
    return { room, player };
  }

  resumeSession(roomCode: string, sessionToken: string, socketId: string): Player {
    const player = roomManager.resumePlayerSession(roomCode.toUpperCase(), sessionToken, socketId);
    if (!player) {
      throw new RoomServiceError(
        'PLAYER_NOT_IN_ROOM',
        'No se pudo recuperar la sesión.',
      );
    }
    return player;
  }

  updateSettings(
    roomCode: string,
    playerId: string,
    settings: RoomSettings,
  ): Room {
    const room = this.requireRoom(roomCode);
    if (room.hostId !== playerId) {
      throw new RoomServiceError('NOT_HOST', 'Solo el anfitrión puede cambiar la configuración.');
    }
    if (room.gameState?.started) {
      throw new RoomServiceError(
        'ROOM_ALREADY_STARTED',
        'La configuración no puede cambiarse después de iniciar la partida.',
      );
    }

    const validation = gameRegistry.validateSettings(settings, room.players.length);
    if (!validation.valid) {
      throw new RoomServiceError(
        'INVALID_ROOM_SETTINGS',
        validation.message ?? 'La configuración de la sala no es válida.',
      );
    }

    const updatedRoom = roomManager.updateRoomSettings(room.code, settings);
    if (!updatedRoom) throw new RoomServiceError('ROOM_NOT_FOUND', 'Sala no encontrada.');
    for (const player of updatedRoom.players) player.isReady = false;
    return updatedRoom;
  }

  startGame(roomCode: string, playerId: string): Room {
    const room = this.requireRoom(roomCode);
    if (room.hostId !== playerId) {
      throw new RoomServiceError('NOT_HOST', 'Solo el anfitrión puede iniciar la partida.');
    }
    if (room.gameState?.started) {
      throw new RoomServiceError('ROOM_ALREADY_STARTED', 'La partida ya está iniciada.');
    }

    const playablePlayers = room.players.filter((player) => !player.isSpectator);
    const validation = gameRegistry.validateSettings(room.settings, playablePlayers.length);
    if (!validation.valid) {
      throw new RoomServiceError(
        'INVALID_ROOM_SETTINGS',
        validation.message ?? 'La configuración de la partida no es válida.',
      );
    }

    const gameId = room.settings.gameId;
    if (!gameId) {
      throw new RoomServiceError('GAME_NOT_AVAILABLE', 'Debes seleccionar un juego.');
    }
    const engine = gameRegistry.getEngine(gameId);
    if (!engine) {
      throw new RoomServiceError(
        'GAME_NOT_AVAILABLE',
        'El motor de este juego todavía no está disponible.',
      );
    }

    room.gameState = engine.createState({ ...room, players: playablePlayers });
    return room;
  }

  private requireRoom(roomCode: string): Room {
    const room = roomManager.getRoom(roomCode.toUpperCase());
    if (!room) throw new RoomServiceError('ROOM_NOT_FOUND', 'Sala no encontrada.');
    return room;
  }
}

export const roomService = new RoomService();
