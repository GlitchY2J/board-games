import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const shabbyTheNarwhal: CardEffect = {
  onEnterStable(state, player) {
    const hasDowngradeInDeck = state.deck.some(
      (c) => c.cardType === 'downgrade',
    );

    if (!hasDowngradeInDeck) return;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'shabby_the_narwhal',
      playerId: player.id,
      title: '🦄 Shabby The Narwhal',
      description:
        '¿Deseas buscar una carta de Downgrade en el mazo y añadirla a tu mano? (Luego se barajará el mazo)',
      options: [
        { value: 'yes', text: 'Sí, buscar' },
        { value: 'no', text: 'No, omitir efecto' },
      ],
    };
  },
};
