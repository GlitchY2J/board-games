import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const jackTheReapercorn: CardEffect = {
  onEnterStable(state, player) {
    if (state.deck.length === 0) return;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'jack_the_reapercorn',
      playerId: player.id,
      title: '💀 Jack the Reapercorn',
      description: '¿Deseas ROBAR una carta?',
      options: [
        { value: 'yes', text: 'Sí, robar una carta' },
        { value: 'no', text: 'No, omitir el efecto' },
      ],
    };
  },
};
