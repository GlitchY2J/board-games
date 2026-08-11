import type { GameState } from '../models/GameState.ts';
import { TurnPhase } from './TurnPhase.ts';
import { CardRepository } from '../unstable-unicorns/CardRepository.ts';
import { VictoryManager } from '../VictoryManager.ts';

export class TurnManager {
  private static drawCard(game: GameState) {
    const player = game.players[game.currentPlayer];

    const card = game.deck.shift();

    if (!card) return;

    player.hand.push(card);

    VictoryManager.checkWinner(game);
  }

  // static endTurn(game: GameState) {
  //   this.nextPhase(game); // END
  //   this.nextPhase(game); // BEGINNNING
  //   this.nextPhase(game); // DRAW
  //   this.nextPhase(game); // ACTION
  // }

  static nextPhase(game: GameState) {
    switch (game.phase) {
      // BEGINNING OF TURN
      case TurnPhase.BEGINNING: {
        const activePlayer = game.players[game.currentPlayer];
        const hasAngel = activePlayer.stable.some((c) => c.id === 'angel_unicorn');
        const discardHasUnicorns = game.discard.some((c) => c.cardType === 'unicorn');

        if (hasAngel && discardHasUnicorns) {
          game.pendingAction = {
            type: 'select_choice',
            reason: 'angel_unicorn',
            playerId: activePlayer.id,
            title: '👼 Angel Unicorn',
            description: '¿Deseas sacrificar a Angel Unicorn para traer un unicornio del descarte a tu establo?',
            options: [
              { value: 'yes', text: 'Sí, sacrificar y traer' },
              { value: 'no', text: 'No, omitir efecto' },
            ],
          };
          return;
        }

        game.phase = TurnPhase.DRAW;
        break;
      }

      // DRAW PHASE
      case TurnPhase.DRAW:
        this.drawCard(game);
        game.phase = TurnPhase.ACTION;
        break;

      // ACTION PHASE
      case TurnPhase.ACTION:
        game.phase = TurnPhase.END;
        break;

      // END OF TURN
      case TurnPhase.END:
        const currentPlayer = game.players[game.currentPlayer];

        if (currentPlayer.hand.length > 7) {
          game.pendingAction = {
            type: 'discard',
            reason: 'hand_limit',
            playerId: currentPlayer.id,
            cardsToDiscard: currentPlayer.hand.length - 7,
          };
          return;
        }

        if (game.extraTurn) {
          game.extraTurn = false;
        } else {
          game.currentPlayer = (game.currentPlayer + 1) % game.players.length;
        }

        game.actionUsed = false;

        if (game.currentPlayer === 0) {
          game.turn++;
        }
        game.phase = TurnPhase.BEGINNING;
        break;
    }

    VictoryManager.checkWinner(game);
  }
}
