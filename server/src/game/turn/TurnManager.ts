import type { GameState } from '../models/GameState.ts';
import { TurnPhase } from './TurnPhase.ts';
import { CardRepository } from '../unstable-unicorns/CardRepository.ts';
import { VictoryManager } from '../VictoryManager.ts';
import { enqueueDrawAnimation } from '../cardAnimations.ts';
import { addLog } from '../../sockets/gameLog.ts';

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

  private static hasEndOfTurnTrigger(game: GameState): boolean {
    const activePlayer = game.players[game.currentPlayer];

    return activePlayer.stable.some(
      (c) => c.effect !== null && END_OF_TURN_EFFECTS.has(c.effect),
    );
  }

  /** Reúne los uids de los efectos de inicio de turno disponibles del jugador activo. */
  private static collectBeginningEffects(game: GameState): string[] {
    const activePlayer = game.players[game.currentPlayer];
    if (!activePlayer) return [];

    const uids: string[] = [];

    const hasSomethingToSacrifice =
      activePlayer.stable.length +
        activePlayer.upgrades.length +
        activePlayer.downgrades.length >
      0;

    const allCards = [
      ...activePlayer.stable,
      ...activePlayer.upgrades,
      ...activePlayer.downgrades,
    ];

    // Se recogen TODAS las copias (por uid): cada copia de un upgrade puede
    // activarse por separado (p. ej. dos Glitter Bomb → dos efectos).
    uids.push(...allCards.filter((c) => c.id === 'rhinocorn').map((c) => c.uid));

    const caffeine = allCards.filter((c) => c.id === 'caffeine_overload');
    if (caffeine.length > 0 && hasSomethingToSacrifice) {
      uids.push(...caffeine.map((c) => c.uid));
    }

    const claw = allCards.filter((c) => c.id === 'claw_machine');
    if (claw.length > 0 && activePlayer.hand.length > 0) {
      uids.push(...claw.map((c) => c.uid));
    }

    const glitter = allCards.filter((c) => c.id === 'glitter_bomb');
    if (glitter.length > 0 && hasSomethingToSacrifice) {
      uids.push(...glitter.map((c) => c.uid));
    }

    return uids;
  }

  /** Arranca el flujo de confirmación de un efecto de inicio de turno concreto (uid). */
  static startBeginningEffect(
    game: GameState,
    uid: string,
  ): boolean {
    const activePlayer = game.players[game.currentPlayer];
    if (!activePlayer) return false;

    const card = [
      ...activePlayer.stable,
      ...activePlayer.upgrades,
      ...activePlayer.downgrades,
    ].find((c) => c.uid === uid);
    if (!card) return false;

    switch (card.id) {
      case 'rhinocorn':
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
          effectCardId: uid,
        };
        return true;
      case 'caffeine_overload':
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
          effectCardId: uid,
        };
        return true;
      case 'claw_machine':
        game.pendingAction = {
          type: 'select_choice',
          reason: 'claw_machine',
          playerId: activePlayer.id,
          title: '🕹️ Claw Machine',
          description:
            '¿Deseas DESCARTAR una carta de tu mano y luego ROBAR una carta?',
          options: [
            { value: 'yes', text: 'Sí, descartar y robar' },
            { value: 'no', text: 'No, omitir el efecto' },
          ],
          effectCardId: uid,
        };
        return true;
      case 'glitter_bomb':
        game.pendingAction = {
          type: 'select_choice',
          reason: 'glitter_bomb',
          playerId: activePlayer.id,
          title: '✨ Glitter Bomb',
          description:
            '¿Deseas SACRIFICAR una carta para luego DESTRUIR una carta?',
          options: [
            { value: 'yes', text: 'Sí, sacrificar y destruir' },
            { value: 'no', text: 'No, omitir el efecto' },
          ],
          effectCardId: uid,
        };
        return true;
      default:
        return false;
    }
  }

  /** Presenta el siguiente efecto pendiente: si hay 2+, abre el overlay selector; si queda 1, lo arranca. */
  private static presentNextBeginningEffect(game: GameState): boolean {
    const q = game.beginningEffectsQueue ?? [];
    if (q.length === 0) return false;

    const activePlayer = game.players[game.currentPlayer];
    if (!activePlayer) {
      game.beginningEffectsQueue = [];
      return false;
    }

    if (q.length >= 2) {
      const cards = [
        ...activePlayer.stable,
        ...activePlayer.upgrades,
        ...activePlayer.downgrades,
      ];
      game.pendingAction = {
        type: 'select_choice',
        reason: 'beginning_effect_picker',
        playerId: activePlayer.id,
        title: '🃏 Efectos de inicio de turno',
        description:
          'Tienes varios efectos de inicio de turno disponibles. Elige cuál resolver primero.',
        options: q.map((uid) => {
          const card = cards.find((c) => c.uid === uid);
          return { value: uid, text: card ? card.name : uid };
        }),
      };
      return true;
    }

    const uid = q[0];
    if (this.startBeginningEffect(game, uid)) {
      game.beginningEffectsQueue = q.slice(1);
      return true;
    }

    // Efecto obsoleto (la carta ya no está): se descarta y se continúa.
    game.beginningEffectsQueue = q.slice(1);
    return this.presentNextBeginningEffect(game);
  }

  /** Si quedan efectos de inicio de turno pendientes, presenta el siguiente.
   *  Si no quedan, avanza a la fase de robo. */
  static processBeginningQueue(game: GameState): boolean {
    if (this.presentNextBeginningEffect(game)) return true;

    game.beginningEffectsQueue = [];
    if (game.phase === TurnPhase.BEGINNING) {
      this.nextPhase(game);
    }
    return false;
  }

  static skipBeginningIfNoTriggers(game: GameState): void {
    if (
      game.phase === TurnPhase.BEGINNING &&
      this.collectBeginningEffects(game).length === 0
    ) {
      game.phase = TurnPhase.DRAW;
    }
  }

  static activateBeginningTriggers(game: GameState): boolean {
    if (game.phase !== TurnPhase.BEGINNING || game.pendingAction) return false;

    const activePlayer = game.players[game.currentPlayer];
    if (!activePlayer) return false;

    game.beginningEffectsQueue = this.collectBeginningEffects(game);

    if (game.beginningEffectsQueue.length === 0) {
      game.beginningEffectsQueue = [];
      return false;
    }

    return this.presentNextBeginningEffect(game);
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
