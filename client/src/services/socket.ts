import { io } from 'socket.io-client';

export const socket = io('https://localhost:3000', {
  autoConnect: false,
});
