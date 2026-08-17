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
  /** Grupo al que pertenece este Neigh. Los Neighs jugados dentro de la ventana
   * de gracia comparten grupo: todos apuntan a la misma carta (no se cancelan
   * entre sí). La carta original es siempre el grupo 0. */
  group?: number;
}

export interface PendingPlay {
  playerId: string;
  playerName: string;
  card: Card;
  startedAt: number;
  durationMs: number;
  acceptedIds: string[];
  chain: PendingPlayLink[];
  /** Hasta cuándo (Date.now()) los Neighs se agrupan con el Neigh actual,
   * apuntando a la misma carta, en vez de encadenarse uno encima del otro. */
  neighGraceUntil?: number;
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
  /** Uids de los efectos de inicio de turno pendientes de resolverse en el turno actual.
   *  Si hay 2 o más, el jugador elige en qué orden resolverlos. */
  beginningEffectsQueue?: string[];
  actionUsed: boolean;
  /** Double Dutch: número de cartas que el jugador activo aún puede jugar en
   *  esta fase de acción (2 si eligió "jugar 2"). Undefined = acción normal. */
  actionPlaysRemaining?: number;
  winnerId?: string;
  extraTurn?: boolean;
  /** Modo debug: permite a cada jugador elegir qué carta del mazo tomar en su fase de robo. Solo el anfitrión lo activa. */
  debugMode?: boolean;
  log: GameLogEntry[];
}
