import type { Deck } from './Deck.ts';
import type { GamePlayer } from './Player.ts';

export interface Game {
  id: string;
  players: GamePlayer[];
  deck: Deck;
  turn: number;
  started: boolean;
}
