import { GameState } from './GameState.ts';
import { Player } from './Player.ts';
import type { RoomSettings } from '../../../../shared/types/GameDefinition.ts';

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
