import { DeckManager } from '../DeckManager.ts';
import { Player } from './Player.ts';

export interface GameState {
  started: boolean;
  turn: number;
  currentPlayer: number;
  players: Player[];
  deck: DeckManager;
}
