import type { GameId, RoomSettings } from './GameDefinition.ts';
import type { PublicPlayer } from './PublicPlayer.ts';

export interface PublicRoom {
  code: string;
  game: GameId;
  hostId: string;
  players: PublicPlayer[];
  expansions: string[];
  settings?: RoomSettings;
}
