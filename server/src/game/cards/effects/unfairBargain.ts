import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const unfairBargain: CardEffect = {
  onPlay(state, player) {
    if (state.players.some((p) => p.id !== player.id)) {
      state.pendingAction = {
        type: 'select_player',
        reason: 'unfair_bargain',
        sourcePlayerId: player.id,
      };
    }
  },
};