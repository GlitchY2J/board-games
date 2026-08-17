import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { isImmuneToMagicDestruction } from './magicalKittencorn.ts';
import { isPandamoniumProtected } from './pandamonium.ts';

export const unicornPoison: CardEffect = {
  onPlay(state, player) {
    const validTargets = state.players.filter(
      (p) =>
        p.id !== player.id &&
        p.stable.some(
          (c) =>
            c.cardType === 'unicorn' &&
            !isImmuneToMagicDestruction(c.id) &&
            !isPandamoniumProtected(p, c),
        ),
    );

    if (validTargets.length === 0) {
      return;
    }

    if (validTargets.length === 1) {
      state.pendingAction = {
        type: 'select_stable_card',
        reason: 'unicorn_poison',
        sourcePlayerId: player.id,
        targetPlayerId: validTargets[0].id,
      };
      return;
    }

    state.pendingAction = {
      type: 'select_player',
      reason: 'unicorn_poison',
      sourcePlayerId: player.id,
    };
  },
};
