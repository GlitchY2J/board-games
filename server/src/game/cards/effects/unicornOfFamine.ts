import type { GameState } from '../../models/GameState.ts';
import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

const DEFAULT_HAND_LIMIT = 7;
const HAND_LIMIT_REDUCTION = 5;

export function getHandLimit(state: GameState, playerId?: string): number {
  const famineCount = state.players.reduce(
    (count, player) =>
      count + player.stable.filter((card) => card.id === 'unicorn_of_famine').length,
    0,
  );

  const player = playerId
    ? state.players.find((candidate) => candidate.id === playerId)
    : undefined;
  const tinyHoovesCount = player?.downgrades?.filter(
    (card) => card.id === 'tiny_hooves',
  ).length ?? 0;

  return Math.max(
    0,
    DEFAULT_HAND_LIMIT - famineCount * HAND_LIMIT_REDUCTION - tinyHoovesCount * 4,
  );
}

export const unicornOfFamine: CardEffect = {};
