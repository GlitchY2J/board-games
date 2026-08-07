import { Socket } from 'socket.io';
import {
  GameActionName,
  GameError,
  GameErrorCode,
} from '../../../shared/types/GameError.ts';
import { Player } from '../game/models/Player.ts';
import { Room } from '../game/models/Room.ts';
import { roomManager } from '../roomManagerInstance.ts';
import { GameState } from '../game/models/GameState.ts';

export type SocketPlayerContext = {
  room: Room;
  player: Player;
};

export type SocketGameContext = SocketPlayerContext & {
  game: GameState;
};

export function emitGameError(
  socket: Socket,
  code: GameErrorCode,
  message: string,
  action: GameActionName = 'unknown',
): void {
  const error: GameError = {
    code,
    message,
    action,
  };

  socket.emit('game-error', error);
}

export function getSocketPlayerContext(
  socket: Socket,
  roomCode: string,
): SocketPlayerContext | null {
  const room = roomManager.getRoom(roomCode);

  if (!room) {
    emitGameError(socket, 'ROOM_NOT_FOUND', 'Sala no encontrada.');
    return null;
  }

  const player = room.players.find(
    (candidate) => candidate.socketId === socket.id,
  );

  if (!player) {
    emitGameError(socket, 'PLAYER_NOT_IN_ROOM', 'No perteneces a esta sala.');
    return null;
  }

  return {
    room,
    player,
  };
}

export function getSocketGameContext(
  socket: Socket,
  roomCode: string,
): SocketGameContext | null {
  const context = getSocketPlayerContext(socket, roomCode);

  if (!context) {
    return null;
  }

  if (!context.room.gameState) {
    emitGameError(
      socket,
      'GAME_NOT_STARTED',
      'La partida todavía no ha comenzado.',
    );
    return null;
  }

  return {
    ...context,
    game: context.room.gameState,
  };
}

export function isActivePlayer(game: GameState, playerId: string): boolean {
  return game.players[game.currentPlayer]?.id === playerId;
}

export function requireActivePlayer(
  socket: Socket,
  context: SocketGameContext,
  action: GameActionName,
): boolean {
  if (!isActivePlayer(context.game, context.player.id)) {
    emitGameError(socket, 'NOT_YOUR_TURN', 'No es tu turno.', action);
    return false;
  }
  return true;
}
