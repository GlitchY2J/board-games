import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { enqueueDrawAnimation } from '../../cardAnimations.ts';

export const greedyFlyingUnicorn: CardEffect = {
  onEnterStable(state, player) {
    const drawn = state.deck.shift();
    if (drawn) {
      enqueueDrawAnimation(state.roomCode, player.id, drawn);
      player.hand.push(drawn);
    }
  },
};
