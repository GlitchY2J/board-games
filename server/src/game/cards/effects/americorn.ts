import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const americorn: CardEffect = {
  onEnterStable(state, player, card) {
    const rivals = state.players.filter(
      (p) => p.id !== player.id && p.hand.length > 0,
    );

    if (rivals.length === 0) return;

    if (rivals.length === 1) {
      state.pendingAction = {
        type: 'select_hand_card',
        reason: 'americorn',
        sourcePlayerId: player.id,
        targetPlayerId: rivals[0].id,
      };
    } else {
      state.pendingAction = {
        type: 'select_player',
        reason: 'americorn',
        sourcePlayerId: player.id,
      };
    }
  },
};