import type { GameServer, GameSocket } from './socketTypes.ts';
import { ActionResolver } from '../game/unstable-unicorns/engine/ActionResolver.ts';
import { TurnManager } from '../game/turn/TurnManager.ts';
import { TurnPhase } from '../game/turn/TurnPhase.ts';
import { roomManager } from '../roomManagerInstance.ts';
import { addLog } from './gameLog.ts';
import { emitGameState } from './gameStateEmitter.ts';

function stableSelectionVerb(reason: string | undefined): string {
  if (
    reason === 'back_kick' ||
    reason === 'stabby_the_unicorn' ||
    reason === 'unicorn_swap_give' ||
    reason === 'dancing_clownicorn'
  ) {
    return reason === 'dancing_clownicorn'
      ? 'regresó a su mano'
      : 'regresó a la mano';
  }

  if (
    reason === 'possession_steal' ||
    reason === 'seductive_unicorn' ||
    reason === 'unicorn_swap_steal' ||
    reason === 'rainbow_lasso_steal' ||
    reason === 'nightmare_existential_dread_steal'
  ) {
    return 'robó';
  }

  return 'destruyó';
}

export function registerStableSelectionHandlers(io: GameServer, socket: GameSocket): void {
  socket.on('select-stable-card', ({ roomCode, cardId }) => {
    const room = roomManager.getRoom(roomCode);
    if (!room?.gameState) return;

    const sourcePlayer = room.gameState.players.find((player) => player.socketId === socket.id);
    if (!sourcePlayer) return;

    const pendingType = room.gameState.pendingAction?.type;
    const pendingReason = room.gameState.pendingAction && 'reason' in room.gameState.pendingAction
      ? room.gameState.pendingAction.reason
      : undefined;
    const pending = room.gameState.pendingAction;
    const selectedCardId = Array.isArray(cardId) ? cardId[0] : cardId;
    const selectedOwnerId =
      pending?.type === 'select_stable_card'
        ? pending.targetPlayerId ?? pending.remainingPlayerIds?.[0]
        : undefined;
    const selectedOwner =
      selectedOwnerId
        ? room.gameState.players.find((player) => player.id === selectedOwnerId)
        : sourcePlayer;
    const selectedCard = selectedOwner?.stable.find(
      (card) => card.uid === selectedCardId,
    );
    const resolved = ActionResolver.handleSelectStableCard(
      room.gameState,
      sourcePlayer.id,
      cardId,
    );
    if (!resolved) return;

    if (!room.gameState.pendingAction && room.gameState.phase === TurnPhase.BEGINNING) {
      TurnManager.processBeginningQueue(room.gameState);
    }
    if (
      pendingType !== 'alluring_narwhal' &&
      pendingReason !== 'shark_with_a_horn' &&
      pendingReason !== 'demonicorn_remove'
    ) {
      addLog(
        room.gameState,
        `${sourcePlayer.name} eligió una carta "${selectedCard?.name ?? 'del establo'}" del establo de ${selectedOwner?.name ?? sourcePlayer.name} y la ${stableSelectionVerb(typeof pendingReason === 'string' ? pendingReason : undefined)}`,
        {
          playerId: sourcePlayer.id,
          cardImage: selectedCard?.image,
        },
      );
    }
    emitGameState(io, room, 'game-updated');
  });
}
