import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const strangeCraftProject: CardEffect = {
  canBeginTurn(_state, player) {
    return player.hand.length >= 3;
  },
  onBeginningTurn(state, player, card) {
    if (!state.players.some((candidate) => candidate.stable.length > 0)) {
      return false;
    }
    state.pendingAction = {
      type: 'select_choice',
      reason: 'strange_craft_project',
      playerId: player.id,
      title: '🛠️ Strange Craft Project',
      description: '¿Deseas DESCARTAR 3 cartas y retirar una carta de cualquier establo de la partida?',
      options: [
        { value: 'yes', text: 'Sí, descartar 3 y retirar carta' },
        { value: 'no', text: 'No, omitir el efecto' },
      ],
      effectCardId: card.uid,
    };
    return true;
  },
};
