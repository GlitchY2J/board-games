import type { GameState } from './models/GameState.ts';

export class VictoryManager {
  static checkWinner(game: GameState) {
    const winner = game.players.find((player) => player.stable.length >= 7);

    if (winner) {
      game.winnerId = winner.id;
    }
  }
}
