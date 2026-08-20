import type { GameState } from '../models/GameState.ts';
import { TurnPhase } from './TurnPhase.ts';
import { CardRepository } from '../unstable-unicorns/CardRepository.ts';
import { VictoryManager } from '../VictoryManager.ts';
import { enqueueDrawAnimation } from '../cardAnimations.ts';
import { addLog } from '../../sockets/gameLog.ts';
import {
  hasAvailableUnicorn,
  hasAvailableCardToSacrifice,
} from '../cards/effects/pandamonium.ts';
import { hasDoubleDutch } from '../cards/effects/doubleDutch.ts';

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

    const allCards = [
      ...activePlayer.stable,
      ...activePlayer.upgrades,
      ...activePlayer.downgrades,
    ];

    // Se recogen TODAS las copias (por uid): cada copia de un upgrade puede
    // activarse por separado (p. ej. dos Glitter Bomb → dos efectos).
    const rhinocorn = allCards.filter((c) => c.id === 'rhinocorn');
    if (
      rhinocorn.length > 0 &&
      game.players.some((p) => p.id !== activePlayer.id && hasAvailableUnicorn(p))
    ) {
      uids.push(...rhinocorn.map((c) => c.uid));
    }

    const caffeine = allCards.filter((c) => c.id === 'caffeine_overload');
    if (caffeine.length > 0 && hasAvailableCardToSacrifice(activePlayer)) {
      uids.push(...caffeine.map((c) => c.uid));
    }

    // Claw Machine es un efecto opcional ("you may"). Se ofrece siempre que el
    // upgrade esté en el establo; si al aceptar la mano no tiene carta para
    // descartar, se resuelve sin efecto en lugar de suprimir la oferta.
    const claw = allCards.filter((c) => c.id === 'claw_machine');
    if (claw.length > 0) {
      uids.push(...claw.map((c) => c.uid));
    }

    const glitter = allCards.filter((c) => c.id === 'glitter_bomb');
    if (glitter.length > 0 && hasAvailableCardToSacrifice(activePlayer)) {
      uids.push(...glitter.map((c) => c.uid));
    }

    // Rainbow Lasso: descartar 3 cartas y luego robar un unicornio. Efecto
    // opcional; se ofrece siempre que el upgrade esté en el establo y haya un
    // unicornio ajeno disponible. Si la mano no llega a 3 cartas al aceptar,
    // se resuelve sin efecto.
    const lasso = allCards.filter((c) => c.id === 'rainbow_lasso');
    if (
      lasso.length > 0 &&
      game.players.some(
        (p) => p.id !== activePlayer.id && hasAvailableUnicorn(p),
      )
    ) {
      uids.push(...lasso.map((c) => c.uid));
    }

    // Stable Artillery: descartar 2 cartas y luego destruir un unicornio de
    // OTRO jugador (no del propio establo). Igual que Lasso: opcional.
    const artillery = allCards.filter((c) => c.id === 'stable_artillery');
    if (
      artillery.length > 0 &&
      game.players.some(
        (p) => p.id !== activePlayer.id && hasAvailableUnicorn(p),
      )
    ) {
      uids.push(...artillery.map((c) => c.uid));
    }

    // Sadistic Ritual: sacrificar un unicornio propio y luego robar una carta.
    // Solo se encola si hay un unicornio disponible para sacrificar; si no hay
    // unicornio, no se puede cumplir la exigencia y no se roba carta.
    const sadistic = allCards.filter((c) => c.id === 'sadistic_ritual');
    if (sadistic.length > 0 && hasAvailableUnicorn(activePlayer)) {
      uids.push(...sadistic.map((c) => c.uid));
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
      case 'rainbow_lasso':
        game.pendingAction = {
          type: 'select_choice',
          reason: 'rainbow_lasso',
          playerId: activePlayer.id,
          title: '🌈 Rainbow Lasso',
          description:
            '¿Deseas DESCARTAR 3 cartas para luego ROBAR un unicornio de otro jugador?',
          options: [
            { value: 'yes', text: 'Sí, descartar 3 y robar un unicornio' },
            { value: 'no', text: 'No, omitir el efecto' },
          ],
          effectCardId: uid,
        };
        return true;
      case 'stable_artillery':
        game.pendingAction = {
          type: 'select_choice',
          reason: 'stable_artillery',
          playerId: activePlayer.id,
          title: '🔫 Stable Artillery',
          description:
            '¿Deseas DESCARTAR 2 cartas para luego DESTRUIR un unicornio?',
          options: [
            { value: 'yes', text: 'Sí, descartar 2 y destruir un unicornio' },
            { value: 'no', text: 'No, omitir el efecto' },
          ],
          effectCardId: uid,
        };
        return true;
      case 'sadistic_ritual':
        // El sacrificio es OBLIGATORIO: no hay confirmación sí/no, se pasa
        // directamente a elegir qué unicornio sacrificar. Si se sacrifica, se
        // roba una carta después.
        game.pendingAction = {
          type: 'select_stable_card',
          reason: 'sadistic_ritual',
          sourcePlayerId: activePlayer.id,
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

  /**
   * Double Dutch: al entrar en la fase de acción, si el jugador activo tiene
   * Double Dutch en su establo (y aún no usó su acción), se le permiten hasta
   * 2 jugadas en la fase de acción. No muestra ningún overlay: el jugador puede
   * robar 1 carta como acción (termina la fase) o jugar cartas de su mano.
   * Si la fase de acción se saltó (actionUsed ya era true), no hay beneficio.
   */
  static applyDoubleDutch(game: GameState): boolean {
    if (game.phase !== TurnPhase.ACTION) return false;
    if (game.pendingAction) return false;
    if (game.actionUsed) return false;
    if (game.actionPlaysRemaining !== undefined) return false;

    const active = game.players[game.currentPlayer];
    if (!active || !hasDoubleDutch(active)) return false;

    game.actionPlaysRemaining = 2;
    return true;
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
    game.actionPlaysRemaining = undefined;

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
