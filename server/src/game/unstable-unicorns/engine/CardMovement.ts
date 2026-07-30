import type { Card } from '../../models/Card.ts';
import type { GameState } from '../../models/GameState.ts';
import type { Player } from '../../models/Player.ts';

export class CardMovement {
  /**
   * Regresa una carta del establo a la mano del jugador.
   * Regla Especial: Si la carta es un Baby Unicorn, regresa a la Nursery en lugar de a la mano.
   */
  static returnToHand(state: GameState, player: Player, card: Card): void {
    if (card.cardType === 'unicorn' && card.unicornClass === 'baby') {
      state.nursery.push(card);
    } else {
      player.hand.push(card);
    }
  }

  /**
   * Destruye o sacrifica una carta del establo mandándola al descarte.
   * Regla Especial: Si la carta es un Baby Unicorn, regresa a la Nursery en lugar del montón de descarte.
   */
  static destroyOrSacrifice(state: GameState, _player: Player, card: Card): void {
    if (card.cardType === 'unicorn' && card.unicornClass === 'baby') {
      state.nursery.push(card);
    } else {
      state.discard.push(card);
    }
  }
}
