import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const unicornSwap: CardEffect = {
  onPlay(state, player) {
    const hasOwnUnicorn = player.stable.some(
      (c) => c.cardType === 'unicorn',
    );
    const hasOpponent = state.players.some(
      (p) =>
        p.id !== player.id &&
        p.stable.some((c) => c.cardType === 'unicorn'),
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