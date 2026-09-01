import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const unicornNap: CardEffect = {
  onPlay(state, player) {
    state.pendingAction = {
      type: 'select_player',
      reason: 'unicorn_nap',
      sourcePlayerId: player.id,
    };
  },
};
