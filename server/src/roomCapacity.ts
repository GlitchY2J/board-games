import type { Room } from './game/models/Room.ts';
import { gameRegistry } from './games/catalog.ts';

export function isRoomFull(room: Room): boolean {
  const game = gameRegistry.getById(room.settings?.gameId ?? room.game);
  if (!game) return false;

  const activePlayers = room.players.filter((player) => player.connected && !player.isSpectator).length;
  return activePlayers >= game.maxPlayers;
}

export function markPlayerAsSpectatorIfRoomIsFull(room: Room, playerId: string): void {
  const game = gameRegistry.getById(room.settings?.gameId ?? room.game);
  const activePlayers = room.players.filter((player) => player.connected && !player.isSpectator).length;
  if (game && activePlayers > game.maxPlayers) {
    const player = room.players.find((candidate) => candidate.id === playerId);
    if (player) player.isSpectator = true;
  }
}
