import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { isBasicUnicornEntryBlocked } from './queenBeeUnicorn.ts';

export const rainbowUnicorn: CardEffect = {
  onEnterStable(state, player) {
    if (isBasicUnicornEntryBlocked(state, player.id)) return;

    const hasBasicInHand = player.hand.some(
      (c) => c.cardType === 'unicorn' && c.unicornClass === 'basic',
    );

    if (!hasBasicInHand) return;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'rainbow_unicorn',
      playerId: player.id,
      title: '🌈 Rainbow Unicorn',
      description:
        '¿Deseas traer un unicornio básico de tu mano directamente a tu establo?',
      options: [
        { value: 'yes', text: 'Sí, traer un básico' },
        { value: 'no', text: 'No, omitir efecto' },
      ],
    };
  },
};