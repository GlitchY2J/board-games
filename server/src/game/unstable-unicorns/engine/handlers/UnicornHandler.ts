import type { Card } from '../../../models/Card.ts';
import type { Player } from '../../../models/Player.ts';

export class UnicornHandler {
  static play(player: Player, card: Card) {
    player.stable.push(card);
  }
}
