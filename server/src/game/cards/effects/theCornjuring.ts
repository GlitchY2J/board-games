import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const theCornjuring: CardEffect = {
  onPlay(state, player) {
    const candidates = state.deck.filter(
      (card) => card.expansion === 'nightmares' && card.cardType === 'downgrade',
    );
    if (candidates.length === 0) return;

    state.pendingAction = {
      type: 'select_deck_card',
      reason: 'the_cornjuring',
      playerId: player.id,
      candidates,
      cardType: 'downgrade',
    };
  },
};
