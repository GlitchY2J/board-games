import { Card } from './Card.ts';

export interface Player {
  id: string;
  socketId: string;
  name: string;
  hand: Card[];
  stable: Card[];
  upgrades: Card[];
  downgrades: Card[];
}
