import type { Card } from '../../models/Card.js';
import type { GameState } from '../../models/GameState.ts';

export class RulesEngine {
  static playCard(
    state: GameState,
    playerId: string,
    cardId: string,
  ): GameState {
    const player = state.players.find((p) => p.id === playerId);

    if (!player) {
      return state;
    }

    const handIndex = player.hand.findIndex((c) => c.id === cardId);

    if (handIndex === -1) {
      return state;
    }

    const card = player.hand.splice(handIndex, 1)[0];

    switch (card.cardType) {
      case 'unicorn':
        player.stable.push(card);
        break;
      case 'upgrade':
        player.upgrades.push(card);
        break;
      case 'downgrade':
        player.downgrades.push(card);
        break;
      case 'magic':
        state.discardPile.push(card);
        break;
      case 'instant':
        state.discardPile.push(card);
        break;
    }

    return state;
  }
}
