import type { Card } from './Card.ts';

export class DeckManager {
  constructor(
    public drawPile: Card[],
    public discardPile: Card[] = [],
  ) {}

  draw(): Card | undefined {
    return this.drawPile.shift();
  }

  discard(card: Card) {
    this.discardPile.push(card);
  }

  shuffle() {
    for (let i = this.drawPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [this.drawPile[i], this.drawPile[j]] = [
        this.drawPile[j],
        this.drawPile[i],
      ];
    }
  }
}
