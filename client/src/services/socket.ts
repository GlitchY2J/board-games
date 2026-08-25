import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../../shared/types/SocketEvents.ts';
import { SERVER_URL } from './serverUrl';

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  SERVER_URL,
  {
    autoConnect: false,
    transports: ['websocket'],
  },
);

socket.on('connect', () => {
  console.log('Socket conectado:', socket.id);
});
