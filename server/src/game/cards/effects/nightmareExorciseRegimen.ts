import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import {
  enqueueDiscardAnimation,
  enqueueDrawAnimation,
} from '../../cardAnimations.ts';

export const nightmareExorciseRegimen: CardEffect = {
  onEnterStable(state, player) {
    for (const card of player.hand.splice(0)) {
      enqueueDiscardAnimation(state.roomCode, player.id, card);
      state.discard.push(card);
    }

    const drawn = state.deck.shift();
    if (drawn) {
      enqueueDrawAnimation(state.roomCode, player.id, drawn);
      player.hand.push(drawn);
    }
  },
};
