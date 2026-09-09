import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const wingedHorrorcorn: CardEffect = {
  onDestroyed(state, _card, player) {
    const targets = state.players.filter(
      (candidate) => candidate.id !== player.id && candidate.hand.length > 0,
    );
    if (targets.length === 0) return;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'winged_horrorcorn',
      playerId: player.id,
      title: '🪽 Winged Horrorcorn',
      description: '¿Deseas mirar y elegir una carta de la mano de otro jugador?',
      options: [
        { value: 'yes', text: 'Sí, mirar una mano' },
        { value: 'no', text: 'No, omitir el efecto' },
      ],
    };
  },
};
