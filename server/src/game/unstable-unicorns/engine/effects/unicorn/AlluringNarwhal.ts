import type { CardEffect } from '../CardEffect.ts';

export const AlluringNarwhal: CardEffect = {
  onEnterStable(state, player, card) {
    state.pendingAction = {
      type: 'alluring_narwhal',
      playerId: player.id,
      sourceCardId: card.id,
    };

    console.log(state.pendingAction);
  },
};
