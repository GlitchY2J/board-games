import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const greedyFlyingUnicorn: CardEffect = {
  onEnterStable(state, player) {
    const drawn = state.deck.shift();
    if (drawn) {
      player.hand.push(drawn);
    }
  },
};
