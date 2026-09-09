import type { Card } from '../../../models/Card.ts';
import type { GameState } from '../../../models/GameState.ts';
import type { Player } from '../../../models/Player.ts';
import { effects } from '../effects/index.ts';
import { CardZoneMovement } from '../CardZoneMovement.ts';

export class MagicHandler {
  static play(state: GameState, player: Player, card: Card) {
    let consumed = false;

    if (card.effect) {
      const effect = effects[card.effect];
      consumed = effect?.onPlay?.(state, player, card) === true;
    }

    if (!consumed) {
      CardZoneMovement.toDiscard(state, card);
    }
  }
}
