import { Card } from './Card';

export interface PublicPlayer {
  id: string;
  socketId: string | null;
  connected: boolean;

  name: string;

  hand: Card[];
  stable: Card[];
  upgrades: Card[];
  downgrades: Card[];
}
