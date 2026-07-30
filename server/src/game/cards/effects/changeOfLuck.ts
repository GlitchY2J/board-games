import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const changeOfLuck: CardEffect = {
  onPlay(state, player) {
    for (let i = 0; i < 2; i++) {
      const drawn = state.deck.shift();
      if (drawn) {
        player.hand.push(drawn);
      }
    }

    state.pendingAction = {
      type: 'discard',
      reason: 'change_of_luck',
      playerId: player.id,
      cardsToDiscard: 3,
    };

    state.extraTurn = true;
  },
};
