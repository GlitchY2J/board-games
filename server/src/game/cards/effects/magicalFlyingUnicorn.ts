import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const magicalFlyingUnicorn: CardEffect = {
  onEnterStable(state, player) {
    const discardHasMagic = state.discard.some(
      (c) => c.cardType === 'magic',
    );

    if (!discardHasMagic) return;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'magical_flying_unicorn',
      playerId: player.id,
      title: '🦄 Magical Flying Unicorn',
      description:
        '¿Deseas tomar una carta de Magia del descarte y añadirla a tu mano?',
      options: [
        { value: 'yes', text: 'Sí, tomar Magia del descarte' },
        { value: 'no', text: 'No, omitir efecto' },
      ],
    };
  },
};