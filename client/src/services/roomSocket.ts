import { socket } from './socket';
import type { RoomCreateResponse } from '../../../shared/types/SocketEvents';

export function createRoom(
  hostName: string,
  game: string,
  callback: (response: RoomCreateResponse) => void,
): void {
  socket.emit(
    'room:create',
    {
      hostName,
      game,
    },
    callback,
  );
}

export function joinRoom(roomCode: string, playerName: string): void {
  socket.emit('join-room', {
    roomCode,
    playerName,
  });
}
