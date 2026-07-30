import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const blatantThievery: CardEffect = {
  onPlay(state, player) {
    const validTargets = state.players.filter(
      (p) => p.id !== player.id && p.hand.length > 0,
    );

    if (validTargets.length === 0) {
      return;
    }

    if (validTargets.length === 1) {
      state.pendingAction = {
        type: 'select_hand_card',
        reason: 'blatant_thievery',
        sourcePlayerId: player.id,
        targetPlayerId: validTargets[0].id,
      };
      return;
    }

    state.pendingAction = {
      type: 'select_player',
      reason: 'blatant_thievery',
      sourcePlayerId: player.id,
    };
  },
};
