import type { Card } from '../../../models/Card.ts';
import type { Player } from '../../../models/Player.ts';

export class UpgradeHandler {
  static play(player: Player, card: Card) {
    player.upgrades.push(card);
  }
}
