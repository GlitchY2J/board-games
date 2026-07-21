import crypto from 'crypto';

import type { Room } from './game/models/Room.ts';
import type { Player } from './game/models/Player.ts';

import { generateRoomCode } from './utils/generateRoomCode.ts';

export class RoomManager {
  private rooms = new Map<string, Room>();

  // Crear Sala
  createRoom(hostName: string, game: string, socketId: string): Room {
    const host: Player = {
      id: crypto.randomUUID(),
      socketId,
      name: hostName,
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
  ): Room | null {
    const room = this.rooms.get(roomCode);

    if (!room) return null;

    const player: Player = {
      id: crypto.randomUUID(),
      socketId,
      name: playerName,
      hand: [],
      stable: [],
      upgrades: [],
      downgrades: [],
    };

    const exists = room.players.some((p) => p.socketId === socketId);

    if (!exists) {
      room.players.push(player);
    }

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
  removePlayer(socketId: string) {
    for (const room of this.rooms.values()) {
      room.players = room.players.filter((p) => p.socketId !== socketId);

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

  // Buscar salas
  getRooms(): Room[] {
    return [...this.rooms.values()];
  }

  // Eliminar sala
  deleteRoom(code: string): void {
    this.rooms.delete(code);
  }
}
