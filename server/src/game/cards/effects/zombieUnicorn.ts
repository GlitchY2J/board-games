import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { hasAvailableUnicorn } from './pandamonium.ts';

export const zombieUnicorn: CardEffect = {
  canBeginTurn(state, player) {
    return (
      hasAvailableUnicorn(player) &&
      state.discard.some((card) => card.cardType === 'unicorn')
    );
  },
  onBeginningTurn(state, player, card) {
    state.pendingAction = {
      type: 'select_choice',
      reason: 'zombie_unicorn',
      playerId: player.id,
      title: '🧟 Zombie Unicorn',
      description:
        '¿Deseas descartar un unicornio para traer un unicornio del descarte? Si lo haces, tu turno terminará inmediatamente.',
      options: [
        { value: 'yes', text: 'Sí, descartar y traer un unicornio' },
        { value: 'no', text: 'No, omitir el efecto' },
      ],
      effectCardId: card.uid,
    };
    return true;
  },
};
