import type { GameServer, GameSocket } from './socketTypes.ts';
import { ActionResolver } from '../game/unstable-unicorns/engine/ActionResolver.ts';
import { TurnManager } from '../game/turn/TurnManager.ts';
import { TurnPhase } from '../game/turn/TurnPhase.ts';
import { emitGameError, getSocketGameContext } from './socketContext.ts';
import { emitGameState } from './gameStateEmitter.ts';
import { addLog } from './gameLog.ts';
import { enqueueStealAnimation } from '../game/cardAnimations.ts';
import type { GameState } from '../game/models/GameState.ts';

function continueBeginningPhaseIfReady(game: GameState): void {
  if (!game.pendingAction && game.phase === TurnPhase.BEGINNING) {
    TurnManager.processBeginningQueue(game);
  }
}

export function registerHandSelectionHandlers(io: GameServer, socket: GameSocket): void {
  socket.on('select-hand-card', ({ roomCode, cardId }) => {
    const context = getSocketGameContext(socket, roomCode);
    if (!context) return;

    const { room, game, player } = context;
    const pending = game.pendingAction;
    if (!pending || pending.type !== 'select_hand_card') {
      emitGameError(socket, 'NO_PENDING_ACTION', 'No hay una selección de mano pendiente.', 'select-hand-card');
      return;
    }

    if (pending.reason === 'favor') {
      if (pending.targetPlayerId !== player.id) return;
      const targetPlayer = game.players.find((candidate) => candidate.id === player.id);
      const sourcePlayer = game.players.find((candidate) => candidate.id === pending.sourcePlayerId);
      const cardIndex = targetPlayer?.hand.findIndex((card) => card.uid === cardId) ?? -1;
      if (!targetPlayer || !sourcePlayer || cardIndex < 0) return;
      const [stolenCard] = targetPlayer.hand.splice(cardIndex, 1);
      sourcePlayer.hand.push(stolenCard);
      const favorIndex = sourcePlayer.hand.findIndex((card) => card.uid === game.pendingPlay?.card.uid);
      if (favorIndex >= 0) {
        const [favorCard] = sourcePlayer.hand.splice(favorIndex, 1);
        game.discard.push(favorCard);
      }
      game.pendingAction = undefined;
      game.pendingPlay = undefined;
      game.currentPlayer = game.players.findIndex((candidate) => candidate.id === sourcePlayer.id);
      game.phase = TurnPhase.ACTION;
      game.actionUsed = false;
      game.actionPlaysRemaining = undefined;
      enqueueStealAnimation(game.roomCode, targetPlayer.id, sourcePlayer.id, stolenCard);
      addLog(game, `${targetPlayer.name} entregó una carta a ${sourcePlayer.name} por Favor`, { playerId: sourcePlayer.id });
      emitGameState(io, room, 'game-updated');
      return;
    }

    if (pending.sourcePlayerId !== player.id) {
      emitGameError(socket, 'NOT_YOUR_TURN', 'No puedes resolver la acción de otro jugador.', 'select-hand-card');
      return;
    }

    let resolvedCardId = cardId;
    if (pending.reason === 'americorn' || pending.reason === 'two_of_a_kind' || pending.reason === 'three_of_a_kind') {
      const targetPlayer = game.players.find((candidate) => candidate.id === pending.targetPlayerId);
      if (!targetPlayer) {
        emitGameError(socket, 'PLAYER_NOT_FOUND', 'No se encontró el jugador objetivo.', 'select-hand-card');
        return;
      }
      const expectedPrefix = pending.reason === 'three_of_a_kind'
        ? `three-of-a-kind-${targetPlayer.id}-`
        : pending.reason === 'two_of_a_kind'
          ? `two-of-a-kind-${targetPlayer.id}-`
          : `hidden-hand-${targetPlayer.id}-`;
      if (cardId.startsWith(expectedPrefix)) {
        const selectedIndex = Number(cardId.slice(expectedPrefix.length));
        if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= targetPlayer.hand.length) {
          emitGameError(socket, 'INVALID_SELECTION', 'La posición de la carta seleccionada no es válida.', 'select-hand-card');
          return;
        }
        resolvedCardId = targetPlayer.hand[selectedIndex].uid;
      }
    }

    const stolenCard = (pending.reason === 'americorn' || pending.reason === 'blatant_thievery' || pending.reason === 'two_of_a_kind' || pending.reason === 'three_of_a_kind')
      ? game.players.find((candidate) => candidate.id === pending.targetPlayerId)?.hand.find((card) => card.uid === resolvedCardId)
      : undefined;
    if (pending.reason === 'three_of_a_kind') {
      const targetPlayer = game.players.find((candidate) => candidate.id === pending.targetPlayerId);
      const selectedCard = targetPlayer?.hand.find((card) => card.uid === resolvedCardId);
      if (!selectedCard || selectedCard.id !== pending.requestedCardType) {
        emitGameError(socket, 'INVALID_SELECTION', 'La carta seleccionada no coincide con el tipo elegido.', 'select-hand-card');
        return;
      }
    }

    if (!ActionResolver.handleSelectHandCard(game, player.id, resolvedCardId)) {
      emitGameError(socket, 'INVALID_SELECTION', 'No se pudo seleccionar esa carta.', 'select-hand-card');
      return;
    }
    if (stolenCard) enqueueStealAnimation(game.roomCode, pending.targetPlayerId, player.id, stolenCard);
    continueBeginningPhaseIfReady(game);
    if (pending.reason === 'americorn') {
      const targetPlayer = game.players.find((candidate) => candidate.id === pending.targetPlayerId);
      addLog(game, targetPlayer ? `${player.name} eligió a ${targetPlayer.name} y robó una carta de su mano al azar` : `${player.name} robó una carta de una mano al azar`, { playerId: player.id });
    } else if (pending.reason === 'two_of_a_kind' || pending.reason === 'three_of_a_kind') {
      addLog(game, `${player.name} robó una carta con ${pending.reason === 'three_of_a_kind' ? 'Three' : 'Two'} of a Kind`, { playerId: player.id });
    } else {
      addLog(game, `${player.name} eligió una carta de una mano`, { playerId: player.id });
    }
    emitGameState(io, room, 'game-updated');
  });
}
