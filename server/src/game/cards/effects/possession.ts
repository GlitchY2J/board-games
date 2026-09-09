import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const possession: CardEffect = {
  onPlay(state, player) {
    if (player.hand.length === 0) return;

    state.pendingAction = {
      type: 'discard',
      reason: 'possession',
      playerId: player.id,
      cardsToDiscard: 1,
    };
  },
};
