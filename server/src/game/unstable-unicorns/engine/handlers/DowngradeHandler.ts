import type { Card } from '../../../models/Card.ts';
import type { Player } from '../../../models/Player.ts';
import { CardMovement } from '../CardMovement.ts';

export class DowngradeHandler {
  static play(player: Player, card: Card) {
    CardMovement.enterStableCard(player, card);
  }
}
