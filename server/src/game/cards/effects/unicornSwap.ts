import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { hasAvailableUnicorn } from './pandamonium.ts';

export const unicornSwap: CardEffect = {
  onPlay(state, player) {
    const hasOwnUnicorn = hasAvailableUnicorn(player);
    const hasOpponent = state.players.some(
      (p) => p.id !== player.id && hasAvailableUnicorn(p),
    );

    if (hasOwnUnicorn && hasOpponent) {
      state.pendingAction = {
        type: 'select_player',
        reason: 'unicorn_swap',
        sourcePlayerId: player.id,
      };
    }
  },
};