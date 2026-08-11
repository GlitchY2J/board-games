import http from 'http';
import { Server } from 'socket.io';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { initializeSocket } from './src/socket.ts';
import { roomManager } from './src/roomManagerInstance.ts';
import type { Room } from './src/game/models/Room.ts';
import { TurnPhase } from './src/game/turn/TurnPhase.ts';

const PORT = 3301;
let failures = 0;

function assert(cond: boolean, label: string) {
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.error(`  ✗ ${label}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const server = http.createServer();
  const io = new Server(server, { cors: { origin: '*' } });
  initializeSocket(io);
  await new Promise<void>((r) => server.listen(PORT, () => r()));
  console.log(`Test server on ${PORT}`);

  const connect = (): Promise<ClientSocket> =>
    new Promise((resolve) => {
      const c = ioc(`http://localhost:${PORT}`);
      c.on('connect', () => resolve(c));
    });

  const c1 = await connect();
  const c2 = await connect();
  const room: Room = roomManager.createRoom('P1', 'unstable-unicorns', c1.id);
  roomManager.joinRoom(room.code, 'P2', c2.id);

  let state: any;
  c1.on('game-started', (s: any) => {
    state = s;
  });
  c1.on('game-updated', (s: any) => {
    state = s;
  });

  c1.emit('start-game', room.code);
  await sleep(150);
  const g = state;

  const emit = (ev: string, payload?: any) =>
    new Promise<void>((resolve) => {
      c1.emit(ev, payload ?? room.code);
      setTimeout(resolve, 120);
    });

  console.log('\n--- Flujo del usuario: click en deck (draw-action-card) ---');
  console.log(`  Inicio: hand=${state.players[0].hand.length}, phase=${state.phase}`);

  const pid = state.players[0].id;
  const pid2 = state.players[1].id;

  // DRAW: robar (click deck)
  await emit('draw-action-card', {
    roomCode: room.code,
    playerId: pid,
  });
  console.log(`  draw (draw phase): hand=${state.players[0].hand.length}, phase=${state.phase}`);

  // ACTION: robar de nuevo (click deck)
  await emit('draw-action-card', {
    roomCode: room.code,
    playerId: pid,
  });
  console.log(`  draw (action phase): hand=${state.players[0].hand.length}, phase=${state.phase}, actionUsed=${state.actionUsed}`);

  // Terminar turno
  await emit('next-phase');
  console.log(`  next-phase (end turn): phase=${state.phase}, currentPlayer=${state.currentPlayer}`);

  assert(state.phase === TurnPhase.BEGINNING || state.phase === TurnPhase.DRAW,
    'END fue saltada y pasó al siguiente jugador');
  assert(state.currentPlayer === 1, 'turno pasó al jugador 2');

  c1.disconnect();
  c2.disconnect();
  io.close();
  server.close();

  console.log(failures === 0 ? '\nTODOS LOS ESCENARIOS PASARON' : `\n${failures} FALLOS`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
