import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const dancingClownicorn: CardEffect = {
  onEnterStable(state, player) {
    if (player.hand.length < 2) return;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'dancing_clownicorn',
      playerId: player.id,
      title: '🤡 Dancing Clownicorn',
      description:
        '¿Deseas DESCARTAR 2 cartas y devolver una carta del establo de cada otro jugador a su mano?',
      options: [
        { value: 'yes', text: 'Sí, descartar 2 cartas' },
        { value: 'no', text: 'No, omitir el efecto' },
      ],
    };
  },
};
