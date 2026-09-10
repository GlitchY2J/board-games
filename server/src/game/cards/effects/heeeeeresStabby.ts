import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const heeeeeresStabby: CardEffect = {
  onPlay(state, player) {
    const targets = state.players
      .filter((candidate) => candidate.stable.length > 0)
      .map((candidate) => candidate.id);
    if (targets.length === 0) return;

    state.pendingAction = {
      type: 'select_stable_card',
      reason: 'heeeeeres_stabby_remove',
      sourcePlayerId: player.id,
      remainingPlayerIds: targets,
    };
  },
};
