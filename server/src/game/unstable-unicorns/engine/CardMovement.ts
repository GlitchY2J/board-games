import type { Card } from '../../models/Card.ts';
import type { GameState } from '../../models/GameState.ts';
import type { Player } from '../../models/Player.ts';
import { effects } from './effects/index.ts';

export class CardMovement {
  /**
   * Coloca una carta de Unicornio en el establo de un jugador y dispara sus efectos de entrada.
   */
  static enterStable(state: GameState, player: Player, card: Card): void {
    player.stable.push(card);

    if (card.effect) {
      const effect = effects[card.effect];
      effect?.onEnterStable?.(state, player, card);
    }
  }

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
   * Regla Especial: Si es un Flying Unicorn, regresa a la mano del jugador.
   */
  static destroyOrSacrifice(state: GameState, player: Player, card: Card): void {
    if (card.cardType === 'unicorn' && card.unicornClass === 'baby') {
      state.nursery.push(card);
      return;
    }

    if (card.id.includes('flying_unicorn')) {
      player.hand.push(card);
      return;
    }

    state.discard.push(card);
  }
}
