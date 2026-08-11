import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const changeOfLuck: CardEffect = {
  onPlay(state, player) {
    for (let i = 0; i < 2; i++) {
      const drawn = state.deck.shift();
      if (drawn) {
        player.hand.push(drawn);
      }
    }

    // Siempre otorgar el turno extra al resolver la carta
    state.extraTurn = true;

    // Descartar el mínimo entre 3 y las cartas disponibles en mano
    const cardsToDiscard = Math.min(3, player.hand.length);

    if (cardsToDiscard > 0) {
      state.pendingAction = {
        type: 'discard',
        reason: 'change_of_luck',
        playerId: player.id,
        cardsToDiscard,
      };
    }
  },
};
