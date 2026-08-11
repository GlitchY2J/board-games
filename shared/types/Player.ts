import type { Card } from './Card.ts';

export interface Player {
  id: string;
  sessionToken: string;
  socketId: string | null;
  connected: boolean;
  name: string;
  hand: Card[];
  stable: Card[];
  upgrades: Card[];
  downgrades: Card[];
}
