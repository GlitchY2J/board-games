import type { Card } from './Card.ts';

export interface Deck {
  drawPile: Card[];
  discardPile: Card[];
}
