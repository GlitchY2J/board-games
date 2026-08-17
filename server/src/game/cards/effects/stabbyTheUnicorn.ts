import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { hasAvailableUnicorn } from './pandamonium.ts';

export const stabbyTheUnicorn: CardEffect = {
  onDestroyed(state, _card, player) {
    const canDestroy = state.players.some((p) => hasAvailableUnicorn(p));

    if (!canDestroy) return;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'stabby_the_unicorn',
      playerId: player.id,
      title: '🔪 Stabby The Unicorn',
      description: 'Stabby fue sacrificado o destruido. ¿Deseas DESTRUIR un unicornio?',
      options: [
        { value: 'yes', text: 'Sí, destruir un unicornio' },
        { value: 'no', text: 'No, omitir efecto' },
      ],
    };
  },
};