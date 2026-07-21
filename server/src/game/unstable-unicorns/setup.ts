import type { GameState } from '../models/GameState.ts';

export class UnstableUnicornsSetup {
  static initialize(state: GameState): void {
    // Barajar
    state.deck.shuffle();

    // Repartir mano inicial
    for (const player of state.players) {
      player.hand = [];

      for (let i = 0; i < 5; i++) {
        const card = state.deck.draw();

        if (card) {
          player.hand.push(card);
        }
      }
    }
  }
}
