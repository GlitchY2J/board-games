import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const swiftyFlyingUnicorn: CardEffect = {
  onEnterStable(state, player) {
    const discardHasNeigh = state.discard.some(
      (c) => c.cardType === 'instant' && (c.effect === 'neigh' || c.effect === 'super_neigh'),
    );

    if (!discardHasNeigh) return;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'swift_flying_unicorn',
      playerId: player.id,
      title: '🕊️ Swifty Flying Unicorn',
      description:
        '¿Deseas tomar una carta Neigh del descarte y añadirla a tu mano?',
      options: [
        { value: 'yes', text: 'Sí, tomar Neigh del descarte' },
        { value: 'no', text: 'No, omitir efecto' },
      ],
    };
  },
};