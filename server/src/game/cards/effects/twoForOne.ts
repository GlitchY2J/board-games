import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const twoForOne: CardEffect = {
  onPlay(state, player) {
    if (player.stable.length === 0) return;
    state.pendingAction = {
      type: 'two_for_one',
      sourcePlayerId: player.id,
      phase: 'sacrifice',
      remainingToDestroy: 2,
    };
  },
};