import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const theGreatNarwhal: CardEffect = {
  onEnterStable(state, player) {
    const hasNarwhalInDeck = state.deck.some((c) =>
      c.name.toLowerCase().includes('narwhal'),
    );

    if (!hasNarwhalInDeck) return;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'the_great_narwhal',
      playerId: player.id,
      title: '🐋 The Great Narwhal',
      description:
        '¿Deseas buscar una carta con "Narwhal" en su nombre en el mazo y añadirla a tu mano? (Luego se barajará el mazo)',
      options: [
        { value: 'yes', text: 'Sí, buscar' },
        { value: 'no', text: 'No, omitir efecto' },
      ],
    };
  },
};