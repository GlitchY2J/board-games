import type { PublicRoom } from '../../../shared/types/PublicRoom.ts';
import type { Room } from '../game/models/Room.ts';

export function createPublicRoom(room: Room): PublicRoom {
  return {
    code: room.code,
    game: room.game,
    hostId: room.hostId,
    expansions: [...(room.expansions ?? [])],
    settings: room.settings
      ? {
          gameId: room.settings.gameId,
          versionId: room.settings.versionId,
          expansionIds: [...room.settings.expansionIds],
        }
      : undefined,
    players: room.players.map(({ id, connected, name, avatar, isDummy, isSpectator, isReady }) => ({
      id,
      connected,
      inGame: room.gameState?.players.some((player) => player.id === id) ?? false,
      name,
      avatar,
      isDummy,
      isSpectator,
      isReady,
    })),
    chat: [...room.chat],
  };
}
