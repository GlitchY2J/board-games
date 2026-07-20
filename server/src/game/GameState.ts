import type { DeckManager } from './DeckManager.ts';
import type { GamePlayer } from './Player.ts';

export interface GameState {
  players: GamePlayer[];
  deck: DeckManager;
  currentPlayer: number;
  turn: number;
  started: boolean;
}
