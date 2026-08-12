import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const motherGooseUnicorn: CardEffect = {
  onEnterStable(state, player) {
    const hasBabyInNursery = state.nursery.some(
      (c) => c.cardType === 'unicorn' && c.unicornClass === 'baby',
    );

    if (!hasBabyInNursery) return;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'mother_goose_unicorn',
      playerId: player.id,
      title: '🦢 Mother Goose Unicorn',
      description:
        '¿Deseas traer un Baby Unicorn de la Nursery a tu establo?',
      options: [
        { value: 'yes', text: 'Sí, traer Baby Unicorn' },
        { value: 'no', text: 'No, omitir efecto' },
      ],
    };
  },
};