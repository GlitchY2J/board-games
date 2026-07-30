import type { Card } from '../../../models/Card.ts';
import type { GameState } from '../../../models/GameState.ts';
import type { Player } from '../../../models/Player.ts';
import { effects } from '../effects/index.ts';

export class UnicornHandler {
  static play(state: GameState, player: Player, card: Card) {
    player.stable.push(card);

    if (card.effect) {
      const effect = effects[card.effect];
      effect?.onEnterStable?.(state, player, card);
    }
  }
}
