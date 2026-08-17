import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const glitterTornado: CardEffect = {
  onPlay(state, player) {
    // Jugadores que tengan al menos una carta en su establo (unicornio,
    // upgrade o downgrade) para que Glitter Tornado pueda afectarlos.
    const playersWithCards = state.players.filter(
      (p) =>
        p.stable.length > 0 ||
        p.upgrades.length > 0 ||
        p.downgrades.length > 0,
    );

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
