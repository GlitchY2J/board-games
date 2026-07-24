import { GameState } from '../models/GameState.ts';
import { TurnPhase } from './TurnPhase.ts';
import { CardRepository } from '../unstable-unicorns/CardRepository.ts';

export class TurnManager {
  private static drawCard(game: GameState) {
    console.log('Deck antes:', game.deck.length);
    const player = game.players[game.currentPlayer];

    const card = game.deck.shift();
    console.log('Carta robada:', card);

    if (!card) return;

    player.hand.push(card);
    console.log('Deck después:', game.deck.length);
  }

  // static endTurn(game: GameState) {
  //   this.nextPhase(game); // END
  //   this.nextPhase(game); // BEGINNNING
  //   this.nextPhase(game); // DRAW
  //   this.nextPhase(game); // ACTION
  // }

  static nextPhase(game: GameState) {
    switch (game.phase) {
      case TurnPhase.BEGINNING:
        game.phase = TurnPhase.DRAW;
        break;
      case TurnPhase.DRAW:
        console.log('Entra a DRAW');
        this.drawCard(game);
        console.log(
          'Cartas en mano:',
          game.players[game.currentPlayer].hand.length,
        );
        game.phase = TurnPhase.ACTION;
        break;
      case TurnPhase.ACTION:
        game.phase = TurnPhase.END;
        break;
      case TurnPhase.END:
        game.currentPlayer = (game.currentPlayer + 1) % game.players.length;

        if (game.currentPlayer === 0) {
          game.turn++;
        }
        game.phase = TurnPhase.BEGINNING;
        break;
    }
  }
}
