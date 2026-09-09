import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const unicornSlasher: CardEffect = {
  onEnterStable(state, player) {
    if (player.hand.length === 0) return;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'unicorn_slasher',
      playerId: player.id,
      title: '🔪 Unicorn Slasher',
      description: '¿Deseas DESCARTAR una carta y retirar otra carta de cualquier establo de la partida?',
      options: [
        { value: 'yes', text: 'Sí, descartar y retirar una carta' },
        { value: 'no', text: 'No, omitir el efecto' },
      ],
    };
  },
};
