import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const annoyingFlyingUnicorn: CardEffect = {
  onEnterStable(state, player, card) {
    const validTargets = state.players.filter(
      (p) => p.id !== player.id && p.hand.length > 0,
    );

    if (validTargets.length === 0) {
      return;
    }

    state.pendingAction = {
      type: 'select_choice',
      reason: 'annoying_flying_unicorn',
       playerId: player.id,
       effectCardId: card.uid,
       sourceCardImage: card.image,
      title: '🦄 Annoying Flying Unicorn',
      description: '¿Deseas activar el efecto de Annoying Flying Unicorn para forzar a otro jugador a descartar una carta?',
      options: [
        { value: 'yes', text: 'Sí, forzar descarte' },
        { value: 'no', text: 'No, omitir efecto' },
      ],
    };
  },
};
