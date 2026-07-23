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
  socketId: string;
  name: string;
  hand: Card[];
  stable: Card[];
  upgrades: Card[];
  downgrades: Card[];
}

export interface GameState {
  roomCode: string;
  deck: Card[];
  discard: Card[];
  nursery: Card[];
  players: Player[];
  currentPlayer: number;
  pendingAction: PendingAction;
}
