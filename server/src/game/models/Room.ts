import { GameState } from './GameState.ts';
import { Player } from './Player.ts';

export interface Room {
  code: string;
  game: string;
  hostId: string;
  players: Player[];
  expansions?: string[];
  gameState?: GameState;
}
