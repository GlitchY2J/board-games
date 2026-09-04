import type { Room } from './game/models/Room.ts';
import { gameRegistry } from './games/catalog.ts';

export function getRoomMaxPlayers(room: Room): number | undefined {
  const game = gameRegistry.getById(room.settings?.gameId ?? room.game);
  if (!game) return undefined;

  const expansions = room.settings?.expansionIds ?? room.expansions ?? [];
  if (
    game.id === 'exploding-kittens' &&
    expansions.includes('imploding_kittens')
  ) {
    return game.maxPlayers + 1;
  }

  return game.maxPlayers;
}

export function isRoomFull(room: Room): boolean {
  const maxPlayers = getRoomMaxPlayers(room);
  if (maxPlayers === undefined) return false;

  const activePlayers = room.players.filter((player) => player.connected && !player.isSpectator).length;
  return activePlayers >= maxPlayers;
}

export function markPlayerAsSpectatorIfRoomIsFull(room: Room, playerId: string): void {
  const maxPlayers = getRoomMaxPlayers(room);
  const activePlayers = room.players.filter((player) => player.connected && !player.isSpectator).length;
  if (maxPlayers !== undefined && activePlayers > maxPlayers) {
    const player = room.players.find((candidate) => candidate.id === playerId);
    if (player) player.isSpectator = true;
  }
}
