import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const unicornOfPestilence: CardEffect = {
  onEnterStable(state, player) {
    state.pendingAction = {
      type: 'select_discard_count',
      reason: 'unicorn_of_pestilence',
      playerId: player.id,
      maxCards: player.hand.length,
    };
  },
};
