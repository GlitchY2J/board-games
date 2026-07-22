import type { Card } from '../../../models/Card.ts';
import type { Player } from '../../../models/Player.ts';

export class DowngradeHandler {
  static play(player: Player, card: Card) {
    player.downgrades.push(card);
  }
}
