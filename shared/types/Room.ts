import type { GameState } from './Game.ts';
import type { Player } from './Player.ts';

export interface Room {
  code: string;
  game: string;
  hostId: string;
  players: Player[];
  expansions?: string[];
  gameState?: GameState;
}
