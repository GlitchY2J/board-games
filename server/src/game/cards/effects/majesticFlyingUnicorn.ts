import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const majesticFlyingUnicorn: CardEffect = {
  onEnterStable(state, player, card) {
    const discardHasUnicorn = state.discard.some(
      (c) => c.cardType === 'unicorn',
    );

    if (!discardHasUnicorn) return;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'majestic_flying_unicorn',
      playerId: player.id,
      effectCardId: card.uid,
      sourceCardImage: card.image,
      title: '🦄 Majestic Flying Unicorn',
      description:
        '¿Deseas tomar una carta de Unicornio del descarte y añadirla a tu mano?',
      options: [
        { value: 'yes', text: 'Sí, tomar Unicornio del descarte' },
        { value: 'no', text: 'No, omitir efecto' },
      ],
    };
  },
};
