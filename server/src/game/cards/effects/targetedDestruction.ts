import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const targetedDestruction: CardEffect = {
  onPlay(state, player) {
    const hasUpgrades = state.players.some((p) => p.upgrades.length > 0);
    const hasMyDowngrades = player.downgrades.length > 0;

    if (!hasUpgrades && !hasMyDowngrades) {
      return;
    }

    state.pendingAction = {
      type: 'select_stable_card',
      reason: 'targeted_destruction',
      sourcePlayerId: player.id,
      targetPlayerId: player.id,
    };
  },
};