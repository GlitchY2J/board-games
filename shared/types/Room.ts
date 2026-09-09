import type { GameState } from './Game.ts';
import type { Player } from './Player.ts';
import type { RoomSettings } from './GameDefinition.ts';

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
}
