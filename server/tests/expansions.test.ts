import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CardRepository } from '../src/game/unstable-unicorns/CardRepository.ts';
import { RoomManager } from '../src/RoomManager.ts';
import { createGameState } from '../src/game/unstable-unicorns/setup.ts';
import type { Room } from '../src/game/models/Room.ts';

test('CardRepository.load: sin expansiones sólo carga el set base', () => {
  const baseCards = CardRepository.load([]);
  assert.ok(baseCards.length > 0);
  const nonBase = baseCards.filter((c) => c.expansion && c.expansion !== 'base');
  assert.equal(nonBase.length, 0, 'No debe cargar cartas de expansiones cuando no se solicitan');
});

test('CardRepository.load: incluye las cartas de la expansión "rainbow" cuando se especifica "rainbow_apocalypse"', () => {
  const allWithRainbow = CardRepository.load(['rainbow_apocalypse']);
  const rainbowCards = allWithRainbow.filter((c) => c.expansion === 'rainbow' || c.expansion === 'rainbow_apocalypse');
  assert.ok(Array.isArray(rainbowCards));
});

test('RoomManager.toggleExpansion: alterna correctamente las expansiones en la sala', () => {
  const roomManager = new RoomManager();
  const room = roomManager.createRoom('HostTest', 'unstable-unicorns', 'socket_1');

  assert.deepEqual(room.expansions, []);

  // Activar Rainbow Apocalypse
  const updated1 = roomManager.toggleExpansion(room.code, 'rainbow_apocalypse');
  assert.deepEqual(updated1?.expansions, ['rainbow_apocalypse']);

  // Desactivar Rainbow Apocalypse
  const updated2 = roomManager.toggleExpansion(room.code, 'rainbow_apocalypse');
  assert.deepEqual(updated2?.expansions, []);
});

test('createGameState: inicializa el mazo de juego con las expansiones de la sala', () => {
  const room: Room = {
    code: 'ROOM_EXP',
    game: 'unstable-unicorns',
    hostId: 'p1',
    players: [
      {
        id: 'p1',
        sessionToken: 'p1',
        socketId: 's1',
        connected: true,
        name: 'P1',
        avatar: 'panda',
        hand: [],
        stable: [],
        upgrades: [],
        downgrades: [],
      },
      {
        id: 'p2',
        sessionToken: 'p2',
        socketId: 's2',
        connected: true,
        name: 'P2',
        avatar: 'fox',
        hand: [],
        stable: [],
        upgrades: [],
        downgrades: [],
      },
    ],
    expansions: ['rainbow_apocalypse'],
  };

  const state = createGameState(room);
  assert.ok(state.deck.length > 0);
});

test('createGameState: usa la configuración especial de 2 jugadores', () => {
  const room: Room = {
    code: 'ROOM_TWO',
    game: 'unstable-unicorns',
    hostId: 'p1',
    players: [
      {
        id: 'p1', sessionToken: 'p1', socketId: 's1', connected: true,
        name: 'P1', avatar: 'panda', hand: [], stable: [], upgrades: [], downgrades: [],
      },
      {
        id: 'p2', sessionToken: 'p2', socketId: 's2', connected: true,
        name: 'P2', avatar: 'fox', hand: [], stable: [], upgrades: [], downgrades: [],
      },
    ],
    expansions: ['rainbow_apocalypse'],
  };

  const state = createGameState(room);
  const forbiddenIds = new Set([
    'queen_bee_unicorn', 'seductive_unicorn', 'rainbow_unicorn', 'nanny_cam',
    'sadistic_ritual', 'slowdown', 'yay', 'mother_goose_unicorn',
    'necromancer_unicorn', 'fire_and_brimstone', 'unicorn_phoenix',
    'storm_of_cuteness', 'magical_kittencorn', 'llamapocalypse', 'llamacorn',
    'adorable_flying_unicorn', 'unicorn_nap',
  ]);
  const allGameCards = [
    ...state.deck,
    ...state.discard,
    ...state.nursery,
    ...state.players.flatMap((player) => [
      ...player.hand, ...player.stable, ...player.upgrades, ...player.downgrades,
    ]),
  ];

  assert.deepEqual(state.players.map((player) => player.hand.length), [6, 6]);
  assert.ok(state.players.every((player) =>
    player.hand.some((card) => card.effect === 'neigh'),
  ));
  assert.equal(allGameCards.some((card) => card.unicornClass === 'basic'), false);
  assert.equal(allGameCards.some((card) => forbiddenIds.has(card.id)), false);
});
