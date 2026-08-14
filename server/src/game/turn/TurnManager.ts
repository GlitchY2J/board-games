import type { GameState } from '../models/GameState.ts';
import { TurnPhase } from './TurnPhase.ts';
import { CardRepository } from '../unstable-unicorns/CardRepository.ts';
import { VictoryManager } from '../VictoryManager.ts';
import { enqueueDrawAnimation } from '../cardAnimations.ts';
import { addLog } from '../../sockets/gameLog.ts';

const BEGINNING_OF_TURN_EFFECTS = new Set([
  'rhinocorn',
  'caffeine_overload',
  'claw_machine',
  'double_dutch',
  'glitter_bomb',
  'rainbow_lasso',
  'stable_artillery',
  'sadistic_ritual',
]);

const END_OF_TURN_EFFECTS = new Set<string>([
  // Add here any card whose effect triggers at the end of your turn
]);

export class TurnManager {
  private static drawCard(game: GameState) {
    const player = game.players[game.currentPlayer];

    const card = game.deck.shift();

    if (!card) return;

    enqueueDrawAnimation(game.roomCode, player.id, card);
    player.hand.push(card);

    addLog(game, `${player.name} robó una carta del mazo`, {
      playerId: player.id,
    });

    VictoryManager.checkWinner(game);
  }

  private static hasBeginningOfTurnTrigger(game: GameState): boolean {
    const activePlayer = game.players[game.currentPlayer];

    const stableCards = [
      ...activePlayer.stable,
      ...activePlayer.upgrades,
      ...activePlayer.downgrades,
    ];

    return stableCards.some(
      (c) => c.effect !== null && BEGINNING_OF_TURN_EFFECTS.has(c.effect),
    );
  }

  private static hasEndOfTurnTrigger(game: GameState): boolean {
    const activePlayer = game.players[game.currentPlayer];

    return activePlayer.stable.some(
      (c) => c.effect !== null && END_OF_TURN_EFFECTS.has(c.effect),
    );
  }

  static skipBeginningIfNoTriggers(game: GameState): void {
    if (
      game.phase === TurnPhase.BEGINNING &&
      !this.hasBeginningOfTurnTrigger(game)
    ) {
      game.phase = TurnPhase.DRAW;
    }
  }

  static activateBeginningTriggers(game: GameState): boolean {
    if (game.phase !== TurnPhase.BEGINNING || game.pendingAction) return false;

    const activePlayer = game.players[game.currentPlayer];
    if (!activePlayer) return false;

    if (activePlayer.stable.some((c) => c.id === 'rhinocorn')) {
      game.pendingAction = {
        type: 'select_choice',
        reason: 'rhinocorn',
        playerId: activePlayer.id,
        title: '🦏 Rhinocorn',
        description:
          '¿Deseas DESTRUIR un unicornio de otro jugador y saltarte el resto de tu turno?',
        options: [
          { value: 'yes', text: 'Sí, destruir y saltar el turno' },
          { value: 'no', text: 'No, continuar mi turno' },
        ],
      };
      return true;
    }

        const hasCaffeineOverload =
      activePlayer.stable.some((c) => c.id === 'caffeine_overload') ||
      activePlayer.upgrades.some((c) => c.id === 'caffeine_overload');

    if (hasCaffeineOverload) {
      const hasSomethingToSacrifice =
        activePlayer.stable.length +
          activePlayer.upgrades.length +
          activePlayer.downgrades.length >
        0;
      if (hasSomethingToSacrifice) {
        game.pendingAction = {
          type: 'select_choice',
          reason: 'caffeine_overload',
          playerId: activePlayer.id,
          title: '☕ Caffeine Overload',
          description:
            '¿Deseas SACRIFICAR una carta para luego ROBAR 2 cartas?',
          options: [
            { value: 'yes', text: 'Sí, sacrificar y robar 2' },
            { value: 'no', text: 'No, omitir el efecto' },
          ],
        };
        return true;
      }
    }

    return false;
  }

  private static passTurn(game: GameState): void {
    const endingPlayer = game.players[game.currentPlayer];

    if (endingPlayer) {
      addLog(game, `${endingPlayer.name} terminó su turno`, {
        playerId: endingPlayer.id,
      });
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
    this.skipBeginningIfNoTriggers(game);

    const startingPlayer = game.players[game.currentPlayer];

    if (startingPlayer) {
      addLog(
        game,
        `Comienza el turno de ${startingPlayer.name} (turno ${game.turn})`,
        { playerId: startingPlayer.id },
      );
    }
  }

  static skipEndIfNoTriggers(game: GameState): void {
    if (game.phase !== TurnPhase.END) return;

    const activePlayer = game.players[game.currentPlayer];

    if (activePlayer.hand.length > 7) {
      game.pendingAction = {
        type: 'discard',
        reason: 'hand_limit',
        playerId: activePlayer.id,
        cardsToDiscard: activePlayer.hand.length - 7,
      };
      return;
    }

    if (this.hasEndOfTurnTrigger(game)) return;

    this.passTurn(game);
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
        game.phase = TurnPhase.DRAW;
        break;
      }

      // DRAW PHASE
      case TurnPhase.DRAW:
        if (game.debugMode && game.deck.length > 0) {
          // Modo debug: el jugador activo elige qué carta del mazo tomar
          const currentPlayer = game.players[game.currentPlayer];
          game.pendingAction = {
            type: 'select_deck_card',
            reason: 'debug_draw',
            playerId: currentPlayer.id,
            candidates: [],
          };
          break;
        }
        this.drawCard(game);
        game.phase = TurnPhase.ACTION;
        break;

      // ACTION PHASE
      case TurnPhase.ACTION:
        game.phase = TurnPhase.END;
        this.skipEndIfNoTriggers(game);
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

        this.passTurn(game);
        break;
    }

    VictoryManager.checkWinner(game);
  }
}
