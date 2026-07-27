import type { Card } from './Card.ts';
import { Player } from './Player.ts';
import type { PendingAction } from './PendingAction.ts';
import { TurnPhase } from '../turn/TurnPhase.ts';

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
}
