import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const reanimation: CardEffect = {
  onPlay(state, player) {
    if (
      !state.discard.some(
        (card) => card.cardType === 'unicorn' && card.unicornClass === 'basic',
      )
    )
      return;

    state.pendingAction = {
      type: 'select_discard_card',
      reason: 'reanimation',
      playerId: player.id,
      cardType: 'unicorn',
    };
  },
};
