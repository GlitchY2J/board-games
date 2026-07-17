import { io } from 'socket.io-client';

export const socket = io('http://localhost:3000', {
  autoConnect: false,
});

socket.on('connect', () => {
  console.log('Socket conectado:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Socket desconectado');
});

socket.on('connect_error', (error) => {
  console.error('Error de conexión:', error.message);
});
