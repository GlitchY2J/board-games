import type { RoomSettings } from './GameDefinition.ts';
import type { PublicPlayer } from './PublicPlayer.ts';
import type { ChatMessage } from './Game.ts';

export interface PublicRoom {
  code: string;
  hostId: string;
  players: PublicPlayer[];
  settings: RoomSettings;
  chat: ChatMessage[];
}
