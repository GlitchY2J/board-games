import http from 'http';
import { Server } from 'socket.io';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { initializeSocket } from './src/socket.ts';
import { roomManager } from './src/roomManagerInstance.ts';
import { createGameState } from './src/game/unstable-unicorns/setup.ts';
import { CardRepository } from './src/game/unstable-unicorns/CardRepository.ts';
import { TurnPhase } from './src/game/turn/TurnPhase.ts';
import type { Room } from './src/game/models/Room.ts';
import type { Card } from './src/game/models/Card.ts';

const PORT = 3299;
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

const allCards = CardRepository.load();

function pick(id: string, suffix: string): Card {
  const def = allCards.find((c) => c.id === id);
  if (!def) throw new Error(`Card ${id} not found`);
  return { ...def, uid: `${id}__${suffix}` };
}

function plainUnicorn(suffix: string): Card {
  const def = allCards.find(
    (c) =>
      c.cardType === 'unicorn' &&
      c.unicornClass === 'basic' &&
      c.effect === null,
  );
  if (!def) throw new Error('No plain basic unicorn found');
  return { ...def, uid: `unicorn__${suffix}` };
}

async function main() {
  const server = http.createServer();
  const io = new Server(server, { cors: { origin: '*' } });
  initializeSocket(io);
  await new Promise<void>((r) => server.listen(PORT, () => r()));
  console.log(`Test server on ${PORT}`);

  const connect = (): Promise<ClientSocket> =>
    new Promise((resolve) => {
      const c = ioc(`http://10.30.11.88:${PORT}`);
      c.on('connect', () => resolve(c));
    });

  const c1 = await connect();
  const c2 = await connect();

  const room: Room = roomManager.createRoom('P1', 'unstable-unicorns', c1.id);
  roomManager.joinRoom(room.code, 'P2', c2.id);

  const [p1, p2] = room.players;
  const token = p1.sessionToken;

  room.gameState = createGameState(room);
  const g = room.gameState;
  g.phase = TurnPhase.ACTION;
  g.actionUsed = false;

  const uni = plainUnicorn('R');
  const neigh = pick('neigh', 'R1');
  g.players[0].hand = [uni];
  g.players[1].hand = [neigh];

  // P1 juega una carta y P2 mete un neigh en la cadena (estado a mitad de acción)
  c1.emit('play-card', {
    roomCode: room.code,
    playerId: p1.id,
    cardId: uni.uid,
  });
  await sleep(150);
  c2.emit('play-neigh', { roomCode: room.code, cardId: neigh.uid });
  await sleep(150);
  assert(g.pendingPlay !== undefined, 'estado con cadena de neighs en curso');
  const chainLenBefore = g.pendingPlay!.chain.length;

  // Simula refresh de P1: nuevo socket con su sessionToken
  const c1b = await connect();
  let resume: any;
  c1b.emit(
    'resume-session',
    { roomCode: room.code, sessionToken: token },
    (resp) => {
      resume = resp;
    },
  );
  await sleep(200);

  assert(resume?.success === true, 'resume-session exitoso');
  assert(resume?.playerId === p1.id, 'playerId recuperado coincide');
  assert(
    resume?.gameState?.pendingPlay !== undefined,
    'gameState recupera la cadena en curso',
  );
  assert(
    resume?.gameState?.pendingPlay?.chain.length === chainLenBefore,
    'la cadena se conservó intacta',
  );
  assert(resume?.gameState?.log?.length > 0, 'log conservado');
  assert(
    room.players.find((p) => p.id === p1.id)?.socketId === c1b.id,
    'socketId de P1 re-asociado al nuevo socket',
  );

  // El jugador recuperado puede seguir jugando: P1 acepta el neigh
  const gamePlayer1 = g.players.find((p) => p.id === p1.id)!;
  gamePlayer1.socketId = c1b.id; // el server ya lo hizo vía resumePlayerSession

  // La ventana tras el neigh de P2 está abierta para P1: acepta desde el socket nuevo
  c1b.emit('neigh-accept', { roomCode: room.code });
  await sleep(150);
  // P1 aceptó, pero P2 es el tope y no puede responder... (2 jugadores: P1 acepta -> P2 no)
  // othersCount = 1, acceptedIds=[P1] -> se resuelve
  assert(
    g.pendingPlay === undefined,
    'P1 pudo seguir jugando tras el refresh (aceptó)',
  );

  c1.disconnect();
  c2.disconnect();
  c1b.disconnect();
  io.close();
  server.close();

  console.log(
    failures === 0 ? '\nTODOS LOS ESCENARIOS PASARON' : `\n${failures} FALLOS`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
