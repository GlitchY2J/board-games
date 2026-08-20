import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CardRepository } from '../src/game/unstable-unicorns/CardRepository.ts';
import type { GameState } from '../src/game/models/GameState.ts';
import type { Player } from '../src/game/models/Player.ts';
import type { Card } from '../src/game/models/Card.ts';
import type { Room } from '../src/game/models/Room.ts';
import { TurnPhase } from '../src/game/turn/TurnPhase.ts';
import { TurnManager } from '../src/game/turn/TurnManager.ts';
import { createGameState } from '../src/game/unstable-unicorns/setup.ts';

let n = 0;
function card(id: string): Card {
  const c = CardRepository.load().find((x) => x.id === id);
  if (!c) throw new Error(`carta no encontrada: ${id}`);
  n += 1;
  return { ...c, uid: `${id}__test${n}` };
}

function makePlayer(id: string): Player {
  return {
    id,
    sessionToken: id,
    socketId: id,
    connected: true,
    name: id,
    avatar: '',
    hand: [],
    stable: [],
    upgrades: [],
    downgrades: [],
  };
}

function makeGame(players: Player[]): GameState {
  return {
    roomCode: 'test',
    started: true,
    turn: 1,
    currentPlayer: 0,
    players,
    deck: [card('basic_unicorn_red'), card('basic_unicorn_blue')],
    nursery: [],
    discard: [],
    phase: TurnPhase.BEGINNING,
    pendingAction: undefined,
    actionUsed: false,
    log: [],
  };
}

test('skipBeginningIfNoTriggers: pasa automáticamente a DRAW si no hay efectos de inicio de turno', () => {
  const p1 = makePlayer('P1');
  p1.stable = [card('baby_unicorn_red')];
  const p2 = makePlayer('P2');
  const state = makeGame([p1, p2]);

  assert.equal(state.phase, TurnPhase.BEGINNING);
  TurnManager.skipBeginningIfNoTriggers(state);
  assert.equal(state.phase, TurnPhase.DRAW);
});

test('skipBeginningIfNoTriggers: mantiene BEGINNING si el jugador tiene Glitter Bomb y carta sacrificable', () => {
  const p1 = makePlayer('P1');
  p1.upgrades = [card('glitter_bomb')];
  p1.stable = [card('baby_unicorn_red')];
  const p2 = makePlayer('P2');
  p2.stable = [card('baby_unicorn_blue')];
  const state = makeGame([p1, p2]);

  assert.equal(state.phase, TurnPhase.BEGINNING);
  TurnManager.skipBeginningIfNoTriggers(state);
  assert.equal(state.phase, TurnPhase.BEGINNING);
});

test('activateBeginningTriggers: presenta el efecto individual y genera pendingAction', () => {
  const p1 = makePlayer('P1');
  p1.upgrades = [card('glitter_bomb')];
  p1.stable = [card('baby_unicorn_red')];
  const p2 = makePlayer('P2');
  p2.stable = [card('baby_unicorn_blue')];
  const state = makeGame([p1, p2]);

  const presented = TurnManager.activateBeginningTriggers(state);
  assert.equal(presented, true);
  assert.equal(state.pendingAction?.type, 'select_choice');
  assert.equal(state.pendingAction?.reason, 'glitter_bomb');
});

test('activateBeginningTriggers: presenta beginning_effect_picker si hay 2+ efectos disponibles', () => {
  const p1 = makePlayer('P1');
  p1.upgrades = [card('glitter_bomb'), card('claw_machine')];
  p1.stable = [card('baby_unicorn_red')];
  const p2 = makePlayer('P2');
  p2.stable = [card('baby_unicorn_blue')];
  const state = makeGame([p1, p2]);

  const presented = TurnManager.activateBeginningTriggers(state);
  assert.equal(presented, true);
  assert.equal(state.pendingAction?.type, 'select_choice');
  assert.equal(state.pendingAction?.reason, 'beginning_effect_picker');
});

test('processBeginningQueue: avanza automáticamente a DRAW cuando se vacía la cola', () => {
  const p1 = makePlayer('P1');
  const state = makeGame([p1]);
  state.beginningEffectsQueue = [];
  state.phase = TurnPhase.BEGINNING;

  const hasMore = TurnManager.processBeginningQueue(state);
  assert.equal(hasMore, false);
  assert.equal(state.phase, TurnPhase.DRAW);
});

test('createGameState: inicializa directamente en fase DRAW cuando los jugadores solo tienen unicornios bebés', () => {
  const room: Room = {
    code: 'ROOM1',
    hostId: 'p1',
    players: [makePlayer('p1'), makePlayer('p2')],
    gameState: null,
  };

  const state = createGameState(room);
  assert.equal(state.phase, TurnPhase.DRAW, 'El juego nuevo debe comenzar en DRAW si no hay efectos de inicio');
});
