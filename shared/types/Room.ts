import type { GameState } from './Game.ts';
import type { Player } from './Player.ts';
import type { RoomSettings } from './GameDefinition.ts';

export interface Room {
  code: string;
  game: string;
  hostId: string;
  players: Player[];
  expansions?: string[];
  /** New lobby configuration; populated during the room/lobby migration. */
  settings?: RoomSettings;
  gameState?: GameState;
}
