import type { Card } from '../../../models/Card.ts';
import type { GameState } from '../../../models/GameState.ts';
import { CardZoneMovement } from '../CardZoneMovement.ts';

export class InstantHandler {
  static play(state: GameState, card: Card) {
    CardZoneMovement.toDiscard(state, card);
  }
}
