import type { GameId, RoomSettings } from './GameDefinition.ts';
import type { PublicPlayer } from './PublicPlayer.ts';
import type { ChatMessage } from './Game.ts';

export interface PublicRoom {
  code: string;
  game: GameId;
  hostId: string;
  players: PublicPlayer[];
  expansions: string[];
  settings?: RoomSettings;
  chat: ChatMessage[];
}
