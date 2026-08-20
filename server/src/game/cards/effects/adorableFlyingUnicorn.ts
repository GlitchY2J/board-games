import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { hasAvailableCardToSacrifice } from './pandamonium.ts';

export const adorableFlyingUnicorn: CardEffect = {
  onEnterStable(state) {
    const remainingPlayerIds = state.players
      .filter((player) => hasAvailableCardToSacrifice(player))
      .map((player) => player.id);

    if (remainingPlayerIds.length === 0) {
      return;
    }

    state.pendingAction = {
      type: 'adorable_flying_unicorn',
      remainingPlayerIds,
      resolvedPlayerIds: [],
    };
  },
};
