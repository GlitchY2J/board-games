import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const ghostGuide: CardEffect = {
  canBeginTurn(state) {
    return state.deck.length > 0;
  },
  onBeginningTurn(state, player, card) {
    state.pendingAction = {
      type: 'select_choice',
      reason: 'ghost_guide',
      playerId: player.id,
      title: '👻 Ghost Guide',
      description: '¿Deseas ROBAR y REVELAR una carta?',
      options: [
        { value: 'yes', text: 'Sí, robar y revelar' },
        { value: 'no', text: 'No, omitir el efecto' },
      ],
      effectCardId: card.uid,
    };
    return true;
  },
};
