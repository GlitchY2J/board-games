import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { enqueueDrawAnimation } from '../../cardAnimations.ts';

export const unicornOnTheCob: CardEffect = {
  onEnterStable(state, player) {
    // Robar 2 cartas del deck
    for (let i = 0; i < 2; i++) {
      const drawn = state.deck.shift();
      if (drawn) {
        enqueueDrawAnimation(state.roomCode, player.id, drawn);
        player.hand.push(drawn);
      }
    }

    // Descartar 1 carta (obligatorio, solo si tiene cartas)
    if (player.hand.length > 0) {
      state.pendingAction = {
        type: 'discard',
        reason: 'unicorn_on_the_cob',
        playerId: player.id,
        cardsToDiscard: 1,
      };
    }
  },
};