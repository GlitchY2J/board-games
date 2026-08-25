import type { GameState } from '../../models/GameState.ts';
import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

const DEFAULT_HAND_LIMIT = 7;
const HAND_LIMIT_REDUCTION = 5;

export function getHandLimit(state: GameState): number {
  const famineCount = state.players.reduce(
    (count, player) =>
      count + player.stable.filter((card) => card.id === 'unicorn_of_famine').length,
    0,
  );

  return Math.max(0, DEFAULT_HAND_LIMIT - famineCount * HAND_LIMIT_REDUCTION);
}

export const unicornOfFamine: CardEffect = {};
