import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const poltergeistSwipe: CardEffect = {
  canBeginTurn(state, player) {
    return state.players.some(
      (candidate) => candidate.id !== player.id && candidate.hand.length > 0,
    );
  },
  onBeginningTurn(state, player, card) {
    state.pendingAction = {
      type: 'select_choice',
      reason: 'poltergeist_swipe',
      playerId: player.id,
      title: '👻 Poltergeist Swipe',
      description: '¿Deseas saltarte tu fase de robo para robar una carta aleatoria de otro jugador?',
      options: [
        { value: 'yes', text: 'Sí, saltar robo y robar carta' },
        { value: 'no', text: 'No, robar normalmente' },
      ],
      effectCardId: card.uid,
    };
    return true;
  },
};
