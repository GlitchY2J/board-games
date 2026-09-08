import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const playfulPuppetUnicorn: CardEffect = {
  onEnterStable(state, player) {
    if (player.downgrades.length === 0) return;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'playful_puppet_unicorn',
      playerId: player.id,
      title: '🪆 Playful Puppet Unicorn',
      description: '¿Deseas mover un Downgrade de tu establo al establo de otro jugador?',
      options: [
        { value: 'yes', text: 'Sí, mover un Downgrade' },
        { value: 'no', text: 'No, omitir el efecto' },
      ],
    };
  },
};
