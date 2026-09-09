import { GameState } from './GameState.ts';
import { Player } from './Player.ts';
import type { RoomSettings } from '../../../../shared/types/GameDefinition.ts';
import type { ChatMessage } from '../../../../shared/types/Game.ts';

export interface Room {
  code: string;
  hostId: string;
  players: Player[];
  settings: RoomSettings;
  /** @deprecated Read from settings instead. Kept for persisted-room migration. */
  game?: string;
  /** @deprecated Read from settings instead. Kept for persisted-room migration. */
  expansions?: string[];
  gameState?: GameState;
  chat: ChatMessage[];
}
