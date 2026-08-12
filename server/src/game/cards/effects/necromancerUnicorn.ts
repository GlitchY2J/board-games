import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const necromancerUnicorn: CardEffect = {
  onEnterStable(state, player, card) {
    const discardable = player.hand.filter(
      (c) => c.cardType === 'unicorn',
    ).length;

    const discardHasUnicorns = state.discard.some(
      (c) => c.cardType === 'unicorn',
    );

    if (discardable < 2 || !discardHasUnicorns) return;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'necromancer_unicorn',
      playerId: player.id,
      title: '🧙 Necromancer Unicorn',
      description:
        '¿Deseas descartar 2 unicornios de TU mano para traer un unicornio del descarte a tu establo?',
      options: [
        { value: 'yes', text: 'Sí, descartar y traer' },
        { value: 'no', text: 'No, omitir efecto' },
      ],
    };
  },
};