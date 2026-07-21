import type { Card } from './Card.ts';
import { Player } from './Player.ts';

export interface GameState {
  roomCode: string;
  started: boolean;
  turn: number;
  currentPlayer: number;
  players: Player[];
  deck: Card[];
  discardPile: Card[];
}
