import type { GameServer, GameSocket } from './sockets/socketTypes.ts';
import { roomManager } from './roomManagerInstance.ts';
import { registerRoomHandlers } from './sockets/roomHandlers.ts';
import { registerGameHandlers } from './sockets/gameHandlers.ts';
import { registerActionHandlers } from './sockets/actionHandlers.ts';
import { emitGameState } from './sockets/gameStateEmitter.ts';

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

      const result = roomManager.disconnectPlayer(socket.id);

      if (!result) {
        return;
      }

      const { room, player } = result;

      console.log(`Jugador desconectado: ${player.name}`);

      io.to(room.code).emit('room-updated', room);

      if (room.gameState) {
        emitGameState(io, room, 'game-updated');
      }
    });
  });
}
