import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const aCuteAttack: CardEffect = {
  onPlay(state, player) {
    const hasTarget = state.players.some(
      (target) =>
        target.id !== player.id &&
        target.stable.some((card) => card.cardType === 'unicorn'),
    );
    if (!hasTarget) return;

    state.pendingAction = {
      type: 'select_player',
      reason: 'a_cute_attack',
      sourcePlayerId: player.id,
    };
  },
};
