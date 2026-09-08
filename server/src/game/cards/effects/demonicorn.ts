import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const demonicorn: CardEffect = {
  onDestroyed(state, _card, player) {
    state.pendingAction = {
      type: 'select_choice',
      reason: 'demonicorn',
      playerId: player.id,
      title: '😈 Demonicorn',
      description: '¿Deseas retirar una carta de cualquier establo de la partida?',
      options: [
        { value: 'yes', text: 'Sí, retirar una carta' },
        { value: 'no', text: 'No, omitir el efecto' },
      ],
    };
  },
};
