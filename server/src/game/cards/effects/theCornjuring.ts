import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const theCornjuring: CardEffect = {
  onPlay(state, player) {
    const hasNightmareDowngrade = state.deck.some(
      (card) => card.expansion === 'nightmares' && card.cardType === 'downgrade',
    );
    if (!hasNightmareDowngrade) return;

    state.pendingAction = {
      type: 'select_player',
      reason: 'the_cornjuring',
      sourcePlayerId: player.id,
    };
  },
};
