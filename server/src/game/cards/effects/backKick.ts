import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const backKick: CardEffect = {
  onPlay(state, player) {
    const validTargets = state.players.filter(
      (p) => p.id !== player.id && (p.stable.length > 0 || p.upgrades.length > 0 || p.downgrades.length > 0),
    );

    if (validTargets.length === 0) {
      return;
    }

    if (validTargets.length === 1) {
      state.pendingAction = {
        type: 'select_stable_card',
        reason: 'back_kick',
        sourcePlayerId: player.id,
        targetPlayerId: validTargets[0].id,
      };
      return;
    }

    state.pendingAction = {
      type: 'select_player',
      reason: 'back_kick',
      sourcePlayerId: player.id,
    };
  },
};
