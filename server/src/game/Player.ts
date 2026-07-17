import type { Card } from './Card.ts';

export interface GamePlayer {
  id: string;
  name: string;
  hand: Card[];
  stable: Card[];
  upgrades: Card[];
  downgrades: Card[];
}
