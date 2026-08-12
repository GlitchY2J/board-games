import type { Card } from '../../models/Card.js';
import type { GameState } from '../../models/GameState.ts';
import { TurnPhase } from '../../turn/TurnPhase.ts';
import { DowngradeHandler } from './handlers/DowngradeHandler.ts';
import { InstantHandler } from './handlers/InstantHandler.ts';
import { MagicHandler } from './handlers/MagicHandler.ts';
import { UnicornHandler } from './handlers/UnicornHandler.ts';
import { UpgradeHandler } from './handlers/UpgradeHandler.ts';
import { VictoryManager } from '../../VictoryManager.ts';
import { isBasicUnicornEntryBlocked } from '../../cards/effects/queenBeeUnicorn.ts';
import {
  actionFailure,
  actionSuccess,
  GameActionResult,
} from '../../../../../shared/types/GameActionResult.ts';

const NEIGH_EFFECTS = new Set(['neigh', 'super_neigh']);

export class RulesEngine {
  static stagePlay(
    state: GameState,
    playerId: string,
    cardId: string,
  ): GameActionResult<{ card: Card }> {
    if (state.phase !== TurnPhase.ACTION) {
      return actionFailure(
        'INVALID_PHASE',
        'Solo puedes jugar una carta durante la fase de acción.',
        'play-card',
      );
    }

    if (state.actionUsed) {
      return actionFailure(
        'ACTION_ALREADY_USED',
        'Ya utilizaste tu acción de este turno.',
        'play-card',
      );
    }

    if (state.pendingAction) {
      return actionFailure(
        'PENDING_ACTION',
        'Debes resolver la acción pendiente antes de jugar otra carta.',
        'play-card',
      );
    }

    if (state.pendingPlay) {
      return actionFailure(
        'PENDING_ACTION',
        'Hay una carta en juego que aún no se ha resuelto.',
        'play-card',
      );
    }

    const activePlayer = state.players[state.currentPlayer];

    if (!activePlayer || activePlayer.id !== playerId) {
      return actionFailure('NOT_YOUR_TURN', 'No es tu turno.', 'play-card');
    }

    const player = state.players.find((candidate) => candidate.id === playerId);

    if (!player) {
      return actionFailure(
        'PLAYER_NOT_FOUND',
        'No se encontró al jugador dentro de la partida.',
        'play-card',
      );
    }

    const handIndex = player.hand.findIndex((card) => card.uid === cardId);

    if (handIndex === -1) {
      return actionFailure(
        'CARD_NOT_FOUND',
        'La carta seleccionada no está en tu mano.',
        'play-card',
      );
    }

    const playedCard = player.hand[handIndex];

    if (playedCard.effect && NEIGH_EFFECTS.has(playedCard.effect)) {
      return actionFailure(
        'ACTION_NOT_ALLOWED',
        'Neigh solo puede jugarse como respuesta a la carta de otro jugador.',
        'play-card',
      );
    }

    if (
      playedCard.cardType === 'unicorn' &&
      playedCard.unicornClass === 'basic' &&
      isBasicUnicornEntryBlocked(state, player.id)
    ) {
      return actionFailure(
        'ACTION_NOT_ALLOWED',
        'Queen Bee Unicorn impide que los unicornios básicos entren a tu establo.',
        'play-card',
      );
    }

    return actionSuccess({ card: playedCard });
  }

  static resolvePlay(
    state: GameState,
    playerId: string,
    card: Card,
  ): GameActionResult<GameState> {
    const player = state.players.find((candidate) => candidate.id === playerId);

    if (!player) {
      return actionFailure(
        'PLAYER_NOT_FOUND',
        'No se encontró al jugador dentro de la partida.',
        'play-card',
      );
    }

    const handIndex = player.hand.findIndex((c) => c.uid === card.uid);

    if (handIndex === -1) {
      return actionFailure(
        'CARD_NOT_FOUND',
        'La carta seleccionada no está en tu mano.',
        'play-card',
      );
    }

    try {
      switch (card.cardType) {
        case 'unicorn':
          UnicornHandler.play(state, player, card);
          break;
        case 'upgrade':
          UpgradeHandler.play(player, card);
          break;
        case 'downgrade':
          DowngradeHandler.play(player, card);
          break;
        case 'magic':
          MagicHandler.play(state, player, card);
          break;
        case 'instant':
          InstantHandler.play(state, card);
          break;
        default:
          return actionFailure(
            'ACTION_NOT_ALLOWED',
            'Este tipo de carta no se puede jugar.',
            'play-card',
          );
      }

      // Retiramos la carta después de comprobar su tipo
      // Los handlers reciben la misma referencia del objeto
      player.hand.splice(handIndex, 1);

      state.actionUsed = true;

      return actionSuccess(state);
    } catch (error) {
      console.error('Error ejecutando el efecto de la carta.', error);
    }

    return actionFailure(
      'INTERNAL_ERROR',
      'Ocurrió un error al ejecutar el efecto de la carta.',
      'play-card',
    );
  }
}
