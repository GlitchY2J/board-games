import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const sweetOldLadycorn: CardEffect = {
  onEnterStable() {
    // Passive: counted as two Unicorns by getStablePower().
  },

  onDestroyed(state, _card, player) {
    const hasCardToSacrifice =
      player.stable.length > 0 ||
      player.upgrades.length > 0 ||
      player.downgrades.length > 0;

    if (!hasCardToSacrifice) return;

    state.pendingAction = {
      type: 'select_stable_card',
      reason: 'sweet_old_ladycorn_sacrifice',
      sourcePlayerId: player.id,
    };
  },
};
