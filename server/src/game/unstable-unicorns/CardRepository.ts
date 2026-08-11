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

    const definitions = JSON.parse(json) as Card[];

    const cards: Card[] = [];

    for (const def of definitions) {
      const count = def.copies > 0 ? def.copies : 1;

      for (let copy = 0; copy < count; copy++) {
        cards.push({
          ...def,
          id: def.id,
          uid: `${def.id}__${copy}`,
          image: `/cards/base/${def.id}.png`,
          copies: 1,
        });
      }
    }

    this.cards = cards;

    return structuredClone(cards);
  }
}
