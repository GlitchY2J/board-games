import type { GameState } from '../models/GameState.ts';

export class TurnManager {
  static nextTurn(state: GameState): void {
    state.currentPlayer++;

    if (state.currentPlayer >= state.players.length) {
      state.currentPlayer = 0;
      state.turn++;
    }
  }

  static getCurrentPlayer(state: GameState) {
    return state.players[state.currentPlayer];
  }
}
