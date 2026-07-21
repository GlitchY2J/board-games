import fs from 'fs';
import path from 'path';
import type { Card } from './models/Card.ts';

export class CardLoader {
  static load(): Card[] {
    const file = path.resolve(
      process.cwd(),
      '../assets/games/unstable-unicorns/cards.json',
    );

    const json = fs.readFileSync(file, 'utf8');

    return JSON.parse(json);
  }
}
