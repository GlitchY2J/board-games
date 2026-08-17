import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { hasAvailableCardToSacrifice } from './pandamonium.ts';

export const twoForOne: CardEffect = {
  onPlay(state, player) {
    if (!hasAvailableCardToSacrifice(player)) return;
    state.pendingAction = {
      type: 'two_for_one',
      sourcePlayerId: player.id,
      phase: 'sacrifice',
      remainingToDestroy: 2,
    };
  },
};