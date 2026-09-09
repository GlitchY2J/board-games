import type { GameServer, GameSocket } from './socketTypes.ts';
import { ActionResolver } from '../game/unstable-unicorns/engine/ActionResolver.ts';
import { TurnManager } from '../game/turn/TurnManager.ts';
import { TurnPhase } from '../game/turn/TurnPhase.ts';
import { emitGameError, getSocketGameContext } from './socketContext.ts';
import { emitGameState } from './gameStateEmitter.ts';
import { addLog } from './gameLog.ts';
import type { GameState } from '../game/models/GameState.ts';

function continueBeginningPhaseIfReady(game: GameState): void {
  if (!game.pendingAction && game.phase === TurnPhase.BEGINNING) {
    TurnManager.processBeginningQueue(game);
  }
}

export function registerDiscardHandlers(io: GameServer, socket: GameSocket): void {
  socket.on('discard-cards', ({ roomCode, playerId, cardIds }) => {
    const context = getSocketGameContext(socket, roomCode);
    if (!context) return;

    const { game, player, room } = context;
    if (playerId !== player.id) {
      emitGameError(socket, 'INVALID_PLAYER', 'El jugador enviado no coincide con tu sesión.', 'discard-card');
      return;
    }
    if (!game.pendingAction) {
      emitGameError(socket, 'NO_PENDING_ACTION', 'No hay una acción de descarte pendiente.', 'discard-card');
      return;
    }

    let resolved = false;
    const discardReason = game.pendingAction.type === 'discard'
      ? game.pendingAction.reason
      : undefined;
    const selectedDiscardedCard = discardReason === 'unicorn_on_the_cob'
      ? player.hand.find((card) => card.uid === cardIds[0])
      : undefined;

    if (game.pendingAction.type === 'select_discard_count') {
      resolved = ActionResolver.handlePestilenceDiscardCount(game, player.id, cardIds);
    } else if (game.pendingAction.type === 'pestilence_discard') {
      resolved = ActionResolver.handlePestilenceDiscard(game, player.id, cardIds);
    } else if (game.pendingAction.type === 'mystical_vortex') {
      resolved = ActionResolver.handleMysticalVortexDiscard(game, player.id, cardIds);
    } else if (game.pendingAction.type === 'llamacorn') {
      resolved = ActionResolver.handleLlamacornDiscard(game, player.id, cardIds);
    } else if (game.pendingAction.type === 'frenchiecorn') {
      resolved = ActionResolver.handleFrenchiecornDiscard(game, player.id, cardIds);
    } else {
      resolved = ActionResolver.handleDiscard(game, player.id, cardIds);
    }

    if (!resolved) {
      emitGameError(socket, 'INVALID_SELECTION', 'La selección de descarte no es válida.', 'discard-card');
      return;
    }

    continueBeginningPhaseIfReady(game);
    const discardedCard = selectedDiscardedCard ?? game.discard.find((card) => card.uid === cardIds[0]);
    if (discardReason === 'unicorn_on_the_cob' && discardedCard) {
      addLog(game, `${player.name} descartó "${discardedCard.name}"`, {
        playerId: player.id,
        cardImage: discardedCard.image,
      });
    } else {
      addLog(game, `${player.name} descartó ${cardIds.length} carta${cardIds.length > 1 ? 's' : ''}`, {
        playerId: player.id,
      });
    }
    emitGameState(io, room, 'game-updated');
  });
}
