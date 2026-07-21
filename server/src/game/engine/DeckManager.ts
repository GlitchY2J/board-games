import type { Card } from '../models/Card.ts';

export class DeckManager {
  drawPile: Card[];
  discardPile: Card[];

  constructor(cards: Card[]) {
    this.drawPile = [...cards];
    this.discardPile = [];
  }

  shuffle(): void {
    for (let i = this.drawPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.drawPile[i], this.drawPile[j]] = [
        this.drawPile[j],
        this.drawPile[i],
      ];
    }
  }

  draw(): Card | undefined {
    return this.drawPile.shift();
  }

  discard(card: Card): void {
    this.discardPile.push(card);
  }
}
