import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { isPandamoniumProtected } from './pandamonium.ts';

export const nightmareCurrentlyIndisposed: CardEffect = {
  onEnterStable(state, player) {
    if (
      !player.stable.some(
        (card) =>
          card.cardType === 'unicorn' && !isPandamoniumProtected(player, card),
      )
    )
      return;

    state.pendingAction = {
      type: 'select_stable_card',
      reason: 'nightmare_currently_indisposed_sacrifice',
      sourcePlayerId: player.id,
    };
  },
};
