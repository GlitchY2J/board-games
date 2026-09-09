import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const nightmareExistentialDread: CardEffect = {
  canBeginTurn(state, player) {
    return state.players.some(
      (candidate) => candidate.id !== player.id && candidate.downgrades.length > 0,
    );
  },
  onBeginningTurn(state, player) {
    state.pendingAction = {
      type: 'select_stable_card',
      reason: 'nightmare_existential_dread_steal',
      sourcePlayerId: player.id,
    };
    return true;
  },
};
