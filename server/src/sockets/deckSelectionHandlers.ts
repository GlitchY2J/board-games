import type { GameServer, GameSocket } from './socketTypes.ts';
import { ActionResolver } from '../game/unstable-unicorns/engine/ActionResolver.ts';
import { TurnManager } from '../game/turn/TurnManager.ts';
import { TurnPhase } from '../game/turn/TurnPhase.ts';
import { roomManager } from '../roomManagerInstance.ts';
import { emitGameError, getSocketGameContext } from './socketContext.ts';
import { emitGameState } from './gameStateEmitter.ts';
import { addLog } from './gameLog.ts';

export function registerDeckSelectionHandlers(io: GameServer, socket: GameSocket): void {
  socket.on('select-oracle-cards', ({ roomCode, handCardId, orderCardIds }) => {
    const room = roomManager.getRoom(roomCode);
    if (!room?.gameState) return;
    const player = room.gameState.players.find((candidate) => candidate.socketId === socket.id);
    const pending = room.gameState.pendingAction;
    if (!player || !pending || pending.type !== 'select_oracle_cards' || pending.playerId !== player.id) return;
    const kept = pending.candidates.find((card) => card.uid === handCardId);
    const remaining = pending.candidates.filter((card) => card.uid !== handCardId);
    if (!kept || remaining.length !== 2 || orderCardIds.length !== 2 || new Set(orderCardIds).size !== 2) return;
    if (!orderCardIds.every((uid) => remaining.some((card) => card.uid === uid))) return;

    player.hand.push(kept);
    room.gameState.deck.unshift(...remaining.slice().sort((a, b) => orderCardIds.indexOf(a.uid) - orderCardIds.indexOf(b.uid)));
    room.gameState.pendingAction = undefined;
    if (room.gameState.phase === TurnPhase.BEGINNING) TurnManager.processBeginningQueue(room.gameState);
    addLog(room.gameState, `${player.name} añadió una carta a su mano`, { playerId: player.id });
    emitGameState(io, room, 'game-updated');
  });

  socket.on('select-own-hand-card', ({ roomCode, cardId }) => {
    const context = getSocketGameContext(socket, roomCode);
    if (!context) return;
    const { room, game, player } = context;
    const pending = game.pendingAction;
    if (!pending || pending.type !== 'select_own_hand_card' || pending.playerId !== player.id || pending.reason !== 'rainbow_unicorn') return;
    if (!ActionResolver.handleSelectOwnHandCardToStable(game, player.id, cardId)) {
      emitGameError(socket, 'INVALID_SELECTION', 'La carta seleccionada no es un unicornio básico válido.', 'select-own-hand-card');
      return;
    }
    if (game.phase === TurnPhase.BEGINNING && !game.pendingAction) TurnManager.processBeginningQueue(game);
    addLog(game, `${player.name} trajo un unicornio básico de su mano a su establo`, { playerId: player.id });
    emitGameState(io, room, 'game-updated');
  });
}
