import fs from 'fs';
import path from 'path';
import type { Card } from './Card.ts';

export function loadCards(): Card[] {
  const file = path.join(
    process.cwd(),
    '..',
    'assets',
    'games',
    'unstable-unicorns',
    'cards.json',
  );

  const data = fs.readFileSync(file, 'utf-8');

  return JSON.parse(data);
}
