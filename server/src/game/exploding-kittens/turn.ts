import type { GameState } from '../models/GameState.ts';

export function calculateAttackTurns(
  stackedAttacks: number,
  turnPendings: number,
): number {
  const attackTurns = Math.max(1, stackedAttacks) * 2;
  const pendingBonus = turnPendings > 1 ? turnPendings : 0;
  return attackTurns + pendingBonus;
}

export function startAttack(game: GameState, attackerId?: string, attackCount = 1): void {
  if (game.players.length === 0) return;

  const attackerIndex = attackerId
    ? game.players.findIndex((player) => player.id === attackerId)
    : game.currentPlayer;
  game.currentPlayer = ((attackerIndex < 0 ? game.currentPlayer : attackerIndex) + 1) % game.players.length;
  game.turn += 1;
  game.turnsRemaining = Math.max(1, attackCount * 2);
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
