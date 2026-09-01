import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const plagueOfDeath: CardEffect = {
  onPlay(state, player) {
    state.pendingAction = {
      type: 'plague_of_death',
      sourcePlayerId: player.id,
      phase: 'sacrifice',
      cardsToDestroy: 0,
    };
  },
};
