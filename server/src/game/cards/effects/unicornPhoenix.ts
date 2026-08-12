import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const unicornPhoenix: CardEffect = {
  onDestroyed(state, card, player) {
    if (player.hand.length === 0) return false;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'unicorn_phoenix',
      playerId: player.id,
      title: '🐦 Unicorn Phoenix',
      description:
        'Unicorn Phoenix fue sacrificado o destruido. ¿Deseas DESCARTAR una carta de tu mano para salvarlo?',
      options: [
        { value: 'yes', text: 'Sí, descartar una carta y salvar a Phoenix' },
        { value: 'no', text: 'No, dejar que sea destruido' },
      ],
      heldCard: card,
    };

    return true;
  },
};