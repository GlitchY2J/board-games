import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const americorn: CardEffect = {
  onEnterStable(state, player, card) {
    // Buscar si hay rivales con cartas en la mano
    const opponentsWithCards = state.players.filter(
      (p) => p.id !== player.id && p.hand.length > 0,
    );

    if (opponentsWithCards.length === 0) {
      return;
    }

    // Configurar acción pendiente de tipo select_player con motivo americorn
    state.pendingAction = {
      type: 'select_player',
      reason: 'americorn',
      sourcePlayerId: player.id,
    };
  },
};
