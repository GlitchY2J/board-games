import type { Card } from '../../models/Card.ts';
import type { GameState } from '../../models/GameState.ts';
import type { Player } from '../../models/Player.ts';

export const changeOfLuck = {
  onPlay(state: GameState, player: Player, card: Card) {
    // Roba 2 cartas
    for (let i = 0; i < 2; i++) {
      const drawn = state.deck.shift();

      if (drawn) {
        player.hand.push(drawn);
      }
    }

    // Descarta 3 cartas
    state.pendingAction = {
      type: 'discard',
      reason: 'change_of_luck',
      playerId: player.id,
      cardsToDiscard: 3,
    };

    // turno extra
    state.extraTurn = true;
  },
};
