import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { hasAvailableUnicorn } from './pandamonium.ts';

export const cottonCandyUnicorn: CardEffect = {
  onEnterStable(state, player) {
    const remainingPlayerIds = state.players
      .filter((p) => hasAvailableUnicorn(p))
      .map((p) => p.id);

    if (remainingPlayerIds.length === 0) {
      return;
    }

    state.pendingAction = {
      type: 'cotton_candy_unicorn',
      sourcePlayerId: player.id,
      remainingPlayerIds,
      resolvedPlayerIds: [],
    };
  },
};
