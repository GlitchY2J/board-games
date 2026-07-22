import type { Card } from '../../../models/Card.ts';
import type { GameState } from '../../../models/GameState.ts';

export class InstantHandler {
  static play(state: GameState, card: Card) {
    state.discard.push(card);
  }
}
