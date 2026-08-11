import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const goodDeal: CardEffect = {
  onPlay(state, player) {
    // Robar 3 cartas del deck
    for (let i = 0; i < 3; i++) {
      const drawn = state.deck.shift();
      if (drawn) {
        player.hand.push(drawn);
      }
    }

    // El jugador debe descartar 1 carta (solo si tiene cartas)
    if (player.hand.length > 0) {
      state.pendingAction = {
        type: 'discard',
        reason: 'good_deal',
        playerId: player.id,
        cardsToDiscard: 1,
      };
    }
  },
};
