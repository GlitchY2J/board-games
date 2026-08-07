import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const classyNarwhal: CardEffect = {
  onEnterStable(state, player) {
    const hasUpgradeInDeck = state.deck.some((c) => c.cardType === 'upgrade');
    if (!hasUpgradeInDeck) {
      return;
    }

    state.pendingAction = {
      type: 'select_choice',
      reason: 'classy_narwhal',
      playerId: player.id,
      title: '🐳 Classy Narwhal',
      description: '¿Deseas buscar una carta de Mejora en el mazo y agregarla a tu mano? (Luego se barajará el mazo)',
      options: [
        { value: 'yes', text: 'Sí, buscar' },
        { value: 'no', text: 'No, omitir efecto' },
      ],
    };
  },
};
