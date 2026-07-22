import type { PendingAction } from './PendingAction';

export interface Card {
  id: string;
  name: string;
  type: string;
  description: string;
  image: string;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  stable: Card[];
  upgrades: Card[];
  downgrades: Card[];
}

export interface GameState {
  deck: Card[];
  discard: Card[];
  nursery: Card[];
  players: Player[];
  currentPlayer: number;
  pendingAction: PendingAction;
}
