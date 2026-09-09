import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import {
  enqueueDrawAnimation,
} from '../../cardAnimations.ts';
import { CardZoneMovement } from '../../unstable-unicorns/engine/CardZoneMovement.ts';

export const nightmareExorciseRegimen: CardEffect = {
  passive: { kind: 'modifier', handLimitDelta: -3 },
  onEnterStable(state, player) {
    for (const card of player.hand.splice(0)) {
      CardZoneMovement.discard(state, card, player.id);
    }

    const drawn = state.deck.shift();
    if (drawn) {
      enqueueDrawAnimation(state.roomCode, player.id, drawn);
      CardZoneMovement.addToHand(player, drawn);
    }
  },
};
