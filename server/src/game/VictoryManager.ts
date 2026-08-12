import type { GameState } from './models/GameState.ts';
import { getStablePower } from './unstable-unicorns/engine/stablePower.ts';

export class VictoryManager {
  static checkWinner(game: GameState) {
    const winner = game.players.find((player) => getStablePower(player) >= 7);

    if (winner) {
      game.winnerId = winner.id;
    }
  }
}
