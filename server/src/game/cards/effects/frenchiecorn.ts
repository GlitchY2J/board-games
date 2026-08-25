import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const frenchiecorn: CardEffect = {
  onEnterStable(state, player) {
    const remainingPlayerIds = state.players
      .filter((candidate) => candidate.id !== player.id && candidate.hand.length > 0)
      .map((candidate) => candidate.id);

    if (remainingPlayerIds.length === 0) return;

    state.pendingAction = {
      type: 'frenchiecorn',
      sourcePlayerId: player.id,
      remainingPlayerIds,
      resolvedPlayerIds: [],
      discardedCardIds: [],
    };
  },
};
