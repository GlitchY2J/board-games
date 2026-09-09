import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { passiveModifier } from '../../unstable-unicorns/engine/effects/CardPassive.ts';

export const sweetOldLadycorn: CardEffect = {
  passive: passiveModifier,

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
