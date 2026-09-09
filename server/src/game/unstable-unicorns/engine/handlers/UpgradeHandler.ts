import type { Card } from '../../../models/Card.ts';
import type { Player } from '../../../models/Player.ts';
import { CardMovement } from '../CardMovement.ts';

export class UpgradeHandler {
  static play(player: Player, card: Card) {
    CardMovement.enterStableCard(player, card);
  }
}
