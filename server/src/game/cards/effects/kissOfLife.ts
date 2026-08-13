import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const kissOfLife: CardEffect = {
  onPlay(state, player) {
    const hasUnicornInDiscard = state.discard.some(
      (c) => c.cardType === 'unicorn',
    );

    if (!hasUnicornInDiscard) return;

    state.pendingAction = {
      type: 'select_discard_card',
      reason: 'kiss_of_life',
      playerId: player.id,
      cardType: 'unicorn',
    };
  },
};