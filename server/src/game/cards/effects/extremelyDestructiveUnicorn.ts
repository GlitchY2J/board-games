import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const extremelyDestructiveUnicorn: CardEffect = {
  onEnterStable(state) {
    const remainingPlayerIds = state.players
      .filter((player) =>
        player.stable.some((card) => card.cardType === 'unicorn'),
      )
      .map((player) => player.id);

    if (remainingPlayerIds.length === 0) {
      return;
    }

    state.pendingAction = {
      type: 'extremely_destructive_unicorn',
      remainingPlayerIds,
      resolvedPlayerIds: [],
    };
  },
};
