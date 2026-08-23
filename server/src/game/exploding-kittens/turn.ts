import type { GameState } from '../models/GameState.ts';

export function startAttack(game: GameState): void {
  if (game.players.length === 0) return;

  game.currentPlayer = (game.currentPlayer + 1) % game.players.length;
  game.turn += 1;
  game.turnsRemaining = 2;
  game.phase = 'DRAW';
  game.actionUsed = false;
  game.actionPlaysRemaining = undefined;
  game.pendingAction = undefined;
  game.pendingPlay = undefined;
}

export function advanceTurnAfterDraw(game: GameState): void {
  if (game.players.length === 0) return;

  const turnsRemaining = game.turnsRemaining ?? 1;
  if (turnsRemaining > 1) {
    game.turnsRemaining = turnsRemaining - 1;
    game.phase = 'DRAW';
    game.actionUsed = false;
    game.actionPlaysRemaining = undefined;
    return;
  }

  game.currentPlayer = (game.currentPlayer + 1) % game.players.length;
  game.turn += 1;
  game.turnsRemaining = 1;
  game.phase = 'DRAW';
  game.actionUsed = false;
  game.actionPlaysRemaining = undefined;
  game.pendingAction = undefined;
  game.pendingPlay = undefined;
}
