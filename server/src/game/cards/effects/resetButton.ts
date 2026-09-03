import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { addLog } from '../../../sockets/gameLog.ts';
import { enqueueShuffleAnimation } from '../../cardAnimations.ts';

export const resetButton: CardEffect = {
  onPlay(state, player, card) {
    // Cada jugador sacrifica todos sus Upgrades y Downgrades al descarte.
    for (const p of state.players) {
      while (p.upgrades.length) state.discard.push(p.upgrades.pop()!);
      while (p.downgrades.length) state.discard.push(p.downgrades.pop()!);
    }

    // El propio Reset Button también va al descarte antes de barajar.
    state.discard.push(card);

    // Se baraja todo el descarte dentro del mazo.
    state.deck.push(...state.discard);
    state.discard = [];

    for (let i = state.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
    }
    enqueueShuffleAnimation(state.roomCode, player.id);

    addLog(
      state,
      `${player.name} usó Reset Button: todos sacrificaron sus Upgrades y Downgrades, y el descarte se barajó al mazo`,
      { playerId: player.id },
    );

    return true;
  },
};
