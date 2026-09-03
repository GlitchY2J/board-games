import type { GameState } from '../models/GameState.ts';
import type { Card } from '../models/Card.ts';
import type { Player } from '../models/Player.ts';

export function beginExplodingKittenResolution(
  game: GameState,
  player: Player,
  card: Card,
): boolean {
  if (card.id !== 'exploding_kitten' && card.cardType !== 'exploding_kitten') {
    return false;
  }

  game.pendingAction = {
    type: 'exploding_kitten',
    playerId: player.id,
    card,
  };
  return true;
}

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
  game.currentPlayer = nextPlayerIndex(
    game,
    attackerIndex < 0 ? game.currentPlayer : attackerIndex,
  );
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

  game.currentPlayer = nextPlayerIndex(game, game.currentPlayer);
  game.turn += 1;
  game.turnsRemaining = 1;
  game.phase = 'DRAW';
  game.actionUsed = false;
  game.actionPlaysRemaining = undefined;
  game.pendingAction = undefined;
  game.pendingPlay = undefined;
}

export function reverseTurnOrder(game: GameState): void {
  if (game.players.length === 0) return;

  game.turnDirection = game.turnDirection === -1 ? 1 : -1;
  const turnsRemaining = game.turnsRemaining ?? 1;

  if (turnsRemaining > 1) {
    game.turnsRemaining = turnsRemaining - 1;
    game.phase = 'DRAW';
    game.actionUsed = false;
    game.actionPlaysRemaining = undefined;
    return;
  }

  game.currentPlayer = nextPlayerIndex(game, game.currentPlayer);
  game.turn += 1;
  game.turnsRemaining = 1;
  game.phase = 'DRAW';
  game.actionUsed = false;
  game.actionPlaysRemaining = undefined;
  game.pendingAction = undefined;
  game.pendingPlay = undefined;
}

export function startTargetedAttack(
  game: GameState,
  targetPlayerId: string,
  attackCount = 1,
): void {
  const targetIndex = game.players.findIndex((player) => player.id === targetPlayerId);
  if (targetIndex < 0) return;

  game.currentPlayer = targetIndex;
  game.turn += 1;
  game.turnsRemaining = Math.max(1, attackCount * 2);
  game.phase = 'DRAW';
  game.actionUsed = false;
  game.actionPlaysRemaining = undefined;
  game.pendingAction = undefined;
  game.pendingPlay = undefined;
}

export function nextPlayerIndex(game: GameState, playerIndex: number): number {
  const direction = game.turnDirection ?? 1;
  return (playerIndex + direction + game.players.length) % game.players.length;
}
