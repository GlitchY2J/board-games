import type { Card } from './models/Card.ts';

export interface Deck {
  drawPile: Card[];
  discardPile: Card[];
}
