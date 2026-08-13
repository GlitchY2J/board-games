import crypto from 'crypto';

import type { Room } from './game/models/Room.ts';
import type { Player } from './game/models/Player.ts';

import { generateRoomCode } from './utils/generateRoomCode.ts';

export class RoomManager {
  private rooms = new Map<string, Room>();

  resumePlayerSession(
    roomCode: string,
    sessionToken: string,
    socketId: string,
  ): Player | null {
    const room = this.getRoom(roomCode);

    if (!room) {
      return null;
    }

    const player = room.players.find(
      (candidate) => candidate.sessionToken === sessionToken,
    );

    if (!player) {
      return null;
    }

    player.socketId = socketId;
    player.connected = true;

    // Actualizamos el socketId de la copia del jugador en GameState
    const gamePlayer = room.gameState?.players.find(
      (candidate) => candidate.id === player.id,
    );

    if (gamePlayer) {
      gamePlayer.socketId = socketId;
      gamePlayer.connected = true;
    }

    return player;
  }

  // Crear Sala
  createRoom(
    hostName: string,
    game: string,
    socketId: string,
    avatar?: string,
  ): Room {
    const host: Player = {
      id: crypto.randomUUID(),
      sessionToken: crypto.randomUUID(),
      socketId,
      connected: true,
      name: hostName,
      avatar: avatar ?? '',
      hand: [],
      stable: [],
      upgrades: [],
      downgrades: [],
    };

    const room: Room = {
      code: generateRoomCode(),
      game,
      hostId: host.id,
      players: [host],
    };
    this.rooms.set(room.code, room);

    return room;
  }

  // Unirse a Sala
  joinRoom(
    roomCode: string,
    playerName: string,
    socketId: string,
    avatar?: string,
  ): Room | null {
    const room = this.rooms.get(roomCode);

    if (!room) return null;

    const existingPlayer = room.players.find((p) => p.socketId === socketId);

    if (existingPlayer) {
      return room;
    }

    const player: Player = {
      id: crypto.randomUUID(),
      sessionToken: crypto.randomUUID(),
      socketId,
      connected: true,
      name: playerName,
      avatar: avatar ?? '',
      hand: [],
      stable: [],
      upgrades: [],
      downgrades: [],
    };

    room.players.push(player);

    return room;
  }

  // Obtener sala
  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  // Actualizar estado del juego
  updateGameState(code: string, gameState: Room['gameState']) {
    const room = this.rooms.get(code);

    if (!room) return;

    room.gameState = gameState;
  }

  // Verificar si la sala existe
  roomExists(code: string): boolean {
    return this.rooms.has(code);
  }

  // Remover jugador
  removePlayer(socketId: string, playerId?: string) {
    for (const room of this.rooms.values()) {
      room.players = room.players.filter(
        (p) => p.socketId !== socketId && (!playerId || p.id !== playerId),
      );

      if (room.players.length === 0) {
        this.rooms.delete(room.code);
        return;
      }

      const host = room.players.find((p) => p.id === room.hostId);

      if (!host) {
        room.hostId = room.players[0].id;
      }
    }
  }

  // Desconectar jugador
  disconnectPlayer(socketId: string): {
    room: Room;
    player: Player;
  } | null {
    for (const room of this.rooms.values()) {
      const player = room.players.find(
        (candidate) => candidate.socketId === socketId,
      );

      if (!player) {
        continue;
      }

      player.socketId = null;
      player.connected = false;

      const gamePlayer = room.gameState?.players.find(
        (candidate) => candidate.id === player.id,
      );

      if (gamePlayer) {
        gamePlayer.socketId = null;
        gamePlayer.connected = false;
      }

      return {
        room,
        player,
      };
    }
    return null;
  }

  // Buscar salas
  getRooms(): Room[] {
    return [...this.rooms.values()];
  }

  // Eliminar sala
  deleteRoom(code: string): void {
    this.rooms.delete(code);
  }
}
