import type { GameServer, GameSocket } from './sockets/socketTypes.ts';
import { roomManager } from './roomManagerInstance.ts';
import { registerRoomHandlers } from './sockets/roomHandlers.ts';
import { registerGameHandlers } from './sockets/gameHandlers.ts';
import { registerActionHandlers } from './sockets/actionHandlers.ts';

export function initializeSocket(io: GameServer): void {
  // Conexión de cliente
  io.on('connection', (socket: GameSocket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    registerRoomHandlers(io, socket);
    registerGameHandlers(io, socket);
    registerActionHandlers(io, socket);

    // Desconexión
    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`);
      roomManager.removePlayer(socket.id);
    });
  });
}
