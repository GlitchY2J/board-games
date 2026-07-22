import fs from 'fs';
import path from 'path';

import type { Card } from '../models/Card.ts';

export class CardRepository {
  private static cards: Card[] | null = null;

  static load(): Card[] {
    if (this.cards) {
      return structuredClone(this.cards);
    }

    const file = path.join(
      process.cwd(),
      'src',
      'game',
      'unstable-unicorns',
      'data',
      'cards.json',
    );

    const json = fs.readFileSync(file, 'utf8');

    const cards = JSON.parse(json) as Card[];

    cards.forEach((card) => {
      card.image = `/cards/${card.id}.png`;
    });

    this.cards = cards;

    return structuredClone(cards);
  }
}
