import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const darkAngelUnicorn: CardEffect = {
  onEnterStable(state, player, card) {
    const canSacrifice = player.stable.some(
      (c) => c.cardType === 'unicorn',
    );

    if (!canSacrifice) return;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'dark_angel_unicorn',
      playerId: player.id,
      title: '😈 Dark Angel Unicorn',
      description:
        '¿Deseas sacrificar un unicornio de TU establo para traer un unicornio del descarte a tu establo?',
      options: [
        { value: 'yes', text: 'Sí, sacrificar y traer' },
        { value: 'no', text: 'No, omitir efecto' },
      ],
    };
  },
};