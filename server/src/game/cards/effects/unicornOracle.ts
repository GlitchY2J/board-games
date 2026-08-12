import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const unicornOracle: CardEffect = {
  onEnterStable(state, player) {
    // Tomar las 3 cartas superiores del mazo (sin robarlas)
    const candidates: NonNullable<typeof state.deck> = state.deck.splice(0, 3);

    if (candidates.length === 0) return;

    state.pendingAction = {
      type: 'select_oracle_cards',
      playerId: player.id,
      candidates,
    };
  },
};