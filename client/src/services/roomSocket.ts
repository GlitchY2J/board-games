import { socket } from './socket';

export function createRoom(hostName: string, game: string): Promise<any> {
  return new Promise((resolve) => {
    socket.emit(
      'room:create',
      {
        hostName,
        game,
      },
      resolve,
    );
  });
}

export function joinRoom(roomCode: string, playerName: string): Promise<any> {
  return new Promise((resolve) => {
    socket.emit(
      'room:join',
      {
        roomCode,
        playerName,
      },
      resolve,
    );
  });
}
