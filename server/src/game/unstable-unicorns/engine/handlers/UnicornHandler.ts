import type { Card } from '../../../models/Card.ts';
import type { GameState } from '../../../models/GameState.ts';
import type { Player } from '../../../models/Player.ts';
import { CardMovement } from '../CardMovement.ts';

export class UnicornHandler {
  static play(state: GameState, player: Player, card: Card) {
    CardMovement.enterStable(state, player, card);
  }
}
