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
    let chainsawSelection: { cardId: string; targetPlayerId: string; type: 'upgrade' | 'downgrade' } | undefined;
    if (pendingReason === 'chainsaw_unicorn') {
      try {
        chainsawSelection = JSON.parse(selectedCardId);
      } catch {
        return;
      }
    }
    const chainsawTargetPlayer = chainsawSelection
      ? room.gameState.players.find((candidate) => candidate.id === chainsawSelection!.targetPlayerId)
      : undefined;
    const chainsawCard = chainsawSelection && chainsawTargetPlayer
      ? [...chainsawTargetPlayer.upgrades, ...chainsawTargetPlayer.downgrades]
        .find((card) => card.uid === chainsawSelection!.cardId)
      : undefined;
    const chainsawEffectCard = pendingReason === 'chainsaw_unicorn'
      ? room.gameState.players
        .flatMap((candidate) => candidate.stable)
        .find((card) => card.id === 'chainsaw_unicorn')
      : undefined;
    if (pending?.type === 'alluring_narwhal' && !pending.confirmed) {
      if (selectedCardId !== pending.sourceCardId) return;
      pending.confirmed = true;
      emitGameState(io, room, 'game-updated');
      return;
    }
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
       pendingReason !== 'demonicorn_remove' &&
       pendingType !== 'extremely_destructive_unicorn'
    ) {
      if (pendingReason === 'chainsaw_unicorn' && chainsawCard && chainsawTargetPlayer) {
        addLog(
          room.gameState,
          chainsawSelection?.type === 'upgrade'
            ? `${sourcePlayer.name} destruyó "${chainsawCard.name}" de ${chainsawTargetPlayer.name} por el efecto de "Chainsaw Unicorn"`
            : `${sourcePlayer.name} sacrificó "${chainsawCard.name}" por el efecto de "Chainsaw Unicorn"`,
          {
            playerId: sourcePlayer.id,
            cardImages: [chainsawCard.image, chainsawEffectCard?.image].filter(
              (image): image is string => !!image,
            ),
            event: 'discard-card',
          },
        );
        emitGameState(io, room, 'game-updated');
        return;
      }
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
