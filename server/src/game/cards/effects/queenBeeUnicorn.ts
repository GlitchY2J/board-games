import type { GameState } from '../../models/GameState.ts';
import type { Card } from '../../models/Card.ts';
import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const QUEEN_BEE_ID = 'queen_bee_unicorn';

export function getQueenBeeOwnerId(state: GameState): string | undefined {
  for (const player of state.players) {
    if (player.stable.some((card) => card.id === QUEEN_BEE_ID)) {
      return player.id;
    }
  }
  return undefined;
}

export function isBasicUnicornEntryBlocked(
  state: GameState,
  targetPlayerId: string,
): boolean {
  const ownerId = getQueenBeeOwnerId(state);
  if (!ownerId) return false;
  return targetPlayerId !== ownerId;
}

export const queenBeeUnicorn: CardEffect = {
  onEnterStable() {
    // Passive: Basic Unicorn cards cannot enter any player's Stable except yours.
  },
};