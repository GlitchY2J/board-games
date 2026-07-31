import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const glitterTornado: CardEffect = {
  onPlay(state, player) {
    // Solo jugadores que tengan al menos una carta en su establo
    const playersWithCards = state.players.filter((p) => p.stable.length > 0);

    if (playersWithCards.length === 0) {
      return;
    }

    state.pendingAction = {
      type: 'glitter_tornado',
      sourcePlayerId: player.id,
      remainingPlayerIds: playersWithCards.map((p) => p.id),
    };
  },
};
