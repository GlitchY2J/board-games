import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const reTarget: CardEffect = {
  onPlay(state, player) {
    const hasSource = state.players.some(
      (p) => p.upgrades.length > 0 || p.downgrades.length > 0,
    );

    if (!hasSource) return;

    state.pendingAction = {
      type: 'select_player',
      reason: 're_target_source',
      sourcePlayerId: player.id,
    };
  },
};