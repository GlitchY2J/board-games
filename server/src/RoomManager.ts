import type { GameState } from './game/GameState.ts';
import crypto from 'crypto';

export interface Player {
  id: string;
  name: string;
  socketId: string;
}

export interface Room {
  code: string;
  game: string;
  hostId: string;
  players: Player[];
  gameState?: GameState;
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  creatRoom(hostName: string, game: string, socketId: string): Room {
    const room: Room = {
      code: this.generateCode(),
      game,
      hostId: socketId,
      players: [
        {
          id: crypto.randomUUID(),
          socketId,
          name: hostName,
        },
      ],
    };
    this.rooms.set(room.code, room);

    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  joinRoom(code: string, playerName: string, socketId: string): Room | null {
    const room = this.rooms.get(code);

    if (!room) return null;

    room.players.push({
      id: crypto.randomUUID(),
      socketId,
      name: playerName,
    });

    return room;
  }

  deleteRoom(code: string): void {
    this.rooms.delete(code);
  }

  getRooms(): Room[] {
    return [...this.rooms.values()];
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';

    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    return code;
  }
}
