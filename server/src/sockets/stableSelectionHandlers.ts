import type { GameServer, GameSocket } from './socketTypes.ts';
import { ActionResolver } from '../game/unstable-unicorns/engine/ActionResolver.ts';
import { TurnManager } from '../game/turn/TurnManager.ts';
import { TurnPhase } from '../game/turn/TurnPhase.ts';
import { roomManager } from '../roomManagerInstance.ts';
import { addLog } from './gameLog.ts';
import { emitGameState } from './gameStateEmitter.ts';

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
    const resolved = ActionResolver.handleSelectStableCard(
      room.gameState,
      sourcePlayer.id,
      cardId,
    );
    if (!resolved) return;

    if (!room.gameState.pendingAction && room.gameState.phase === TurnPhase.BEGINNING) {
      TurnManager.processBeginningQueue(room.gameState);
    }
    if (pendingType !== 'alluring_narwhal' && pendingReason !== 'shark_with_a_horn') {
      addLog(room.gameState, `${sourcePlayer.name} eligió una carta de su establo`, {
        playerId: sourcePlayer.id,
      });
    }
    emitGameState(io, room, 'game-updated');
  });
}
