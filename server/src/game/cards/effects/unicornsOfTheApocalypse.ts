import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const unicornsOfTheApocalypse: CardEffect = {
  onPlay(state, player) {
    state.pendingAction = {
      type: 'select_stable_card',
      reason: 'unicorns_of_the_apocalypse_sacrifice',
      sourcePlayerId: player.id,
    };
  },
};
