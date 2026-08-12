import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const llamacorn: CardEffect = {
  onEnterStable(state) {
    const remainingPlayerIds = state.players
      .filter((p) => p.hand.length > 0)
      .map((p) => p.id);

    if (remainingPlayerIds.length === 0) {
      return;
    }

    state.pendingAction = {
      type: 'llamacorn',
      remainingPlayerIds,
      resolvedPlayerIds: [],
    };
  },
};
