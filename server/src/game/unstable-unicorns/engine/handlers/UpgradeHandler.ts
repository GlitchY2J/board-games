import type { Card } from '../../../models/Card.ts';
import type { GameState } from '../../../models/GameState.ts';
import type { Player } from '../../../models/Player.ts';
import { CardMovement } from '../CardMovement.ts';

export class UpgradeHandler {
  static play(state: GameState, player: Player, card: Card) {
    CardMovement.enterStableCardWithEffect(state, player, card);
  }
}
