import type { GameState } from '../models/GameState.ts';
import { TurnPhase } from './TurnPhase.ts';
import { VictoryManager } from '../VictoryManager.ts';
import { enqueueDrawAnimation } from '../cardAnimations.ts';
import { addLog } from '../gameLog.ts';
import {
  hasAvailableUnicorn,
} from '../cards/effects/pandamonium.ts';
import { hasDoubleDutch } from '../cards/effects/doubleDutch.ts';
import { getHandLimit } from '../cards/effects/unicornOfFamine.ts';
import { CardZoneMovement } from '../unstable-unicorns/engine/CardZoneMovement.ts';
import { effects } from '../unstable-unicorns/engine/effects/index.ts';

const END_OF_TURN_EFFECTS = new Set<string>([
  // Add here any card whose effect triggers at the end of your turn
]);

export class TurnManager {
  static drawCard(game: GameState) {
    const player = game.players[game.currentPlayer];

    const card = game.deck.shift();

    if (!card) return;

    enqueueDrawAnimation(game.roomCode, player.id, card);
    CardZoneMovement.addToHand(player, card);

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
    for (const card of allCards) {
      const effect = card.effect ? effects[card.effect] : undefined;
      if (effect?.canBeginTurn?.(game, activePlayer, card)) {
        uids.push(card.uid);
      }
    }

    // Se recogen TODAS las copias (por uid): cada copia de un upgrade puede
    // activarse por separado (p. ej. dos Glitter Bomb → dos efectos).
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

    // Marcar el efecto como consumido al iniciarlo. Esto evita que una
    // interacción hija (por ejemplo, traer una carta del descarte) vuelva a
    // presentar el mismo efecto de inicio de turno.
    game.beginningEffectsQueue = (game.beginningEffectsQueue ?? []).filter(
      (effectUid) => effectUid !== uid,
    );

    const registeredEffect = card.effect ? effects[card.effect] : undefined;
    if (registeredEffect?.onBeginningTurn) {
      return registeredEffect.onBeginningTurn(game, activePlayer, card) !== false;
    }

    return false;
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
      if (game.skipDrawPhase) {
        game.skipDrawPhase = false;
        game.phase = TurnPhase.ACTION;
      } else {
        this.nextPhase(game);
      }
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

    // Construir la cola una sola vez por fase evita volver a ofrecer un efecto
    // ya consumido cuando termina una interacción hija.
    if (game.beginningEffectsQueue !== undefined) return false;

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
    game.beginningEffectsQueue = undefined;

    if (game.currentPlayer === 0) {
      game.turn++;
    }

    const startingPlayer = game.players[game.currentPlayer];
    if (startingPlayer && (startingPlayer.skipTurns ?? 0) > 0) {
      startingPlayer.skipTurns = (startingPlayer.skipTurns ?? 0) - 1;
      addLog(game, `${startingPlayer.name} pierde este turno por Unicorn Nap`, {
        playerId: startingPlayer.id,
      });
      this.passTurn(game);
      return;
    }

    game.phase = TurnPhase.BEGINNING;
    const presented = this.activateBeginningTriggers(game);
    if (!presented) {
      this.skipBeginningIfNoTriggers(game);
    }

    if (startingPlayer) {
      addLog(
        game,
        `Comienza el turno de ${startingPlayer.name} (turno ${game.turn})`,
        { playerId: startingPlayer.id },
      );
    }
  }

  static endTurnImmediately(game: GameState): void {
    this.passTurn(game);
  }

  static skipEndIfNoTriggers(game: GameState): void {
    if (game.phase !== TurnPhase.END) return;

    const activePlayer = game.players[game.currentPlayer];

    const handLimit = getHandLimit(game, activePlayer.id);
    if (activePlayer.hand.length > handLimit) {
      game.pendingAction = {
        type: 'discard',
        reason: 'hand_limit',
        playerId: activePlayer.id,
        cardsToDiscard: activePlayer.hand.length - handLimit,
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

        const handLimit = getHandLimit(game, currentPlayer.id);
        if (currentPlayer.hand.length > handLimit) {
          game.pendingAction = {
            type: 'discard',
            reason: 'hand_limit',
            playerId: currentPlayer.id,
            cardsToDiscard: currentPlayer.hand.length - handLimit,
          };
          return;
        }

        this.passTurn(game);
        break;
    }

    VictoryManager.checkWinner(game);
  }
}
