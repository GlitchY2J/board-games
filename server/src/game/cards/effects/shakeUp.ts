import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { enqueueDrawAnimation, enqueueShuffleAnimation } from '../../cardAnimations.ts';

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export const shakeUp: CardEffect = {
  onPlay(state, player, card) {
    // Baraja esta carta, tu mano y el descarte dentro del mazo
    state.deck.push(card, ...player.hand, ...state.discard);
    player.hand = [];
    state.discard = [];

    shuffle(state.deck);
    enqueueShuffleAnimation(state.roomCode, player.id);

    // Roba 5 cartas
    for (let i = 0; i < 5; i++) {
      const drawn = state.deck.shift();
      if (drawn) {
        enqueueDrawAnimation(state.roomCode, player.id, drawn);
        player.hand.push(drawn);
      }
    }

    return true;
  },
};
