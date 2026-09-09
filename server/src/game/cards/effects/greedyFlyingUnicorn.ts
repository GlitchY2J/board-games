import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { enqueueDrawAnimation } from '../../cardAnimations.ts';
import { CardZoneMovement } from '../../unstable-unicorns/engine/CardZoneMovement.ts';

export const greedyFlyingUnicorn: CardEffect = {
  onEnterStable(state, player) {
    const drawn = state.deck.shift();
    if (drawn) {
      enqueueDrawAnimation(state.roomCode, player.id, drawn);
      CardZoneMovement.addToHand(player, drawn);
    }
  },
};
