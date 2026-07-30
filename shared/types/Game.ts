import type { Card } from './Card.ts';
import type { Player } from './Player.ts';
import type { PendingAction } from './PendingAction.ts';

export enum TurnPhase {
  BEGINNING = 'BEGINNING',
  DRAW = 'DRAW',
  ACTION = 'ACTION',
  END = 'END',
}

export interface GameState {
  roomCode: string;
  started: boolean;
  turn: number;
  currentPlayer: number;
  players: Player[];
  deck: Card[];
  nursery: Card[];
  discard: Card[];
  phase: TurnPhase;
  pendingAction?: PendingAction;
  actionUsed: boolean;
  winnerId?: string;
  extraTurn?: boolean;
}
