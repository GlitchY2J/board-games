import type { Card } from './Card.ts';
import type { Player } from './Player.ts';
import type { PendingAction } from './PendingAction.ts';

export type TurnPhase = 'BEGINNING' | 'DRAW' | 'ACTION' | 'END';

export const TurnPhase = {
  BEGINNING: 'BEGINNING',
  DRAW: 'DRAW',
  ACTION: 'ACTION',
  END: 'END',
} as const;

export interface PendingPlayLink {
  playerId: string;
  playerName: string;
  card: Card;
}

export interface PendingPlay {
  playerId: string;
  playerName: string;
  card: Card;
  startedAt: number;
  durationMs: number;
  acceptedIds: string[];
  chain: PendingPlayLink[];
}

export interface GameLogEntry {
  id: string;
  text: string;
  playerId?: string;
  playerName?: string;
  turn: number;
  timestamp: number;
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
  pendingPlay?: PendingPlay;
  /** Cola LIFO de pasos de flujo pendientes de reanudar cuando termine la acción actual (p. ej. efectos on-enter anidados). */
  pendingResume?: PendingAction[];
  actionUsed: boolean;
  winnerId?: string;
  extraTurn?: boolean;
  log: GameLogEntry[];
}
