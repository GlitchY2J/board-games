import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { isPandamoniumProtected } from './pandamonium.ts';

export const supernaturalSelection: CardEffect = {
  onPlay(state, player) {
    const targets = state.players.some(
      (candidate) =>
        candidate.id !== player.id &&
        candidate.stable.some(
          (card) =>
            card.cardType === 'unicorn' &&
            card.unicornClass === 'basic' &&
            !isPandamoniumProtected(candidate, card),
        ),
    );
    if (!targets) return;

    state.pendingAction = {
      type: 'select_player',
      reason: 'supernatural_selection',
      sourcePlayerId: player.id,
    };
  },
};
