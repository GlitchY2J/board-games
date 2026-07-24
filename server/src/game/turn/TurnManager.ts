import { GameState } from '../models/GameState.ts';
import { TurnPhase } from './TurnPhase.ts';
import { CardRepository } from '../unstable-unicorns/CardRepository.ts';

export class TurnManager {
  private static drawCard(game: GameState) {
    const player = game.players[game.currentPlayer];

    const card = game.deck.shift();

    if (!card) return;

    player.hand.push(card);
  }

  static endTurn(game: GameState) {
    this.nextPhase(game); // END
    this.nextPhase(game); // BEGINNNING
    this.nextPhase(game); // DRAW
    this.nextPhase(game); // ACTION
  }

  static nextPhase(game: GameState) {
    switch (game.phase) {
      case TurnPhase.BEGINNING:
        game.phase = TurnPhase.DRAW;
        break;
      case TurnPhase.DRAW:
        this.drawCard(game);
        game.phase = TurnPhase.ACTION;
        break;
      case TurnPhase.ACTION:
        game.phase = TurnPhase.END;
        break;
      case TurnPhase.END:
        game.currentPlayer = (game.currentPlayer + 1) % game.players.length;
        game.phase = TurnPhase.BEGINNING;
        break;
    }
  }
}
