import fs from 'fs';
import path from 'path';

import type { Card } from '../models/Card.ts';

export class CardRepository {
  private static definitions: Card[] | null = null;

  static load(expansions: string[] = []): Card[] {
    if (!this.definitions) {
      const file = path.join(
        process.cwd(),
        'src',
        'game',
        'unstable-unicorns',
        'data',
        'cards.json',
      );

      const json = fs.readFileSync(file, 'utf8');
      this.definitions = JSON.parse(json) as Card[];
    }

    const activeExpansions = new Set(['base']);
    for (const exp of expansions || []) {
      activeExpansions.add(exp);
      if (exp === 'rainbow_apocalypse') {
        activeExpansions.add('rainbow');
      }
    }

    const filteredDefs = this.definitions.filter(
      (def) => !def.expansion || activeExpansions.has(def.expansion),
    );

    const cards: Card[] = [];

    for (const def of filteredDefs) {
      const count = def.copies > 0 ? def.copies : 1;

      for (let copy = 0; copy < count; copy++) {
        const expDir = def.expansion || 'base';
        cards.push({
          ...def,
          id: def.id,
          uid: `${def.id}__${copy}`,
          image: def.image || `/cards/${expDir}/${def.id}.png`,
          copies: 1,
        });
      }
    }

    return structuredClone(cards);
  }
}
