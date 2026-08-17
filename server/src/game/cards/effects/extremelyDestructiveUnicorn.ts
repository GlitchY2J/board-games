import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { hasAvailableUnicorn } from './pandamonium.ts';

export const extremelyDestructiveUnicorn: CardEffect = {
  onEnterStable(state) {
    const remainingPlayerIds = state.players
      .filter((player) => hasAvailableUnicorn(player))
      .map((player) => player.id);

    if (remainingPlayerIds.length === 0) {
      return;
    }

    state.pendingAction = {
      type: 'extremely_destructive_unicorn',
      remainingPlayerIds,
      resolvedPlayerIds: [],
    };
  },
};
