import type { Card } from '../../../models/Card.ts';
import type { GameState } from '../../../models/GameState.ts';
import { Player } from '../../../models/Player.ts';
import { effects } from '../effects/index.ts';

export class MagicHandler {
  static play(state: GameState, player: Player, card: Card) {
    if (card.effect) {
      const effect = effects[card.effect as keyof typeof effects];

      effect?.onPlay?.(state, player, card);
    }

    state.discard.push(card);
  }
}
