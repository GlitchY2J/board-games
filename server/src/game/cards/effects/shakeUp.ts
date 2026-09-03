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
    const playedCardIndex = player.hand.findIndex((handCard) => handCard.uid === card.uid);
    if (playedCardIndex !== -1) {
      player.hand.splice(playedCardIndex, 1);
    }

    const returnedCards = [card, ...player.hand];
    state.discard.push(card);

    // Baraja la mano restante y todo el descarte, incluido Shake Up, dentro del mazo.
    state.deck.push(...player.hand, ...state.discard);
    player.hand = [];
    state.discard = [];

    shuffle(state.deck);
    enqueueShuffleAnimation(state.roomCode, player.id, returnedCards);

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
