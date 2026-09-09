import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { isPandamoniumProtected } from './pandamonium.ts';

export const vengefulUnicorn: CardEffect = {
  onEnterStable(state, player) {
    const canSacrifice = player.stable.some(
      (card) =>
        card.cardType === 'unicorn' &&
        card.unicornClass === 'basic' &&
        !isPandamoniumProtected(player, card),
    );
    if (!canSacrifice) return;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'vengeful_unicorn',
      playerId: player.id,
      title: '⚔️ Vengeful Unicorn',
      description: '¿Deseas SACRIFICAR un Basic Unicorn para ROBAR 3 cartas?',
      options: [
        { value: 'yes', text: 'Sí, sacrificar y robar 3' },
        { value: 'no', text: 'No, omitir el efecto' },
      ],
    };
  },
};
