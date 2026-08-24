import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { GameState } from '../src/game/models/GameState.ts';
import type { Player } from '../src/game/models/Player.ts';
import { TurnPhase } from '../src/game/turn/TurnPhase.ts';
import {
  advanceTurnAfterDraw,
  calculateAttackTurns,
} from '../src/game/exploding-kittens/turn.ts';

function player(id: string): Player {
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

function game(): GameState {
  return {
    roomCode: 'TEST',
    started: true,
    turn: 1,
    currentPlayer: 0,
    players: [player('P1'), player('P2'), player('P3')],
    deck: [],
    nursery: [],
    discard: [],
    phase: TurnPhase.DRAW,
    turnsRemaining: 1,
    actionUsed: false,
    log: [],
  };
}

test('Attack asigna dos turnos por cada Attack apilado', () => {
  assert.equal(calculateAttackTurns(1, 1), 2);
  assert.equal(calculateAttackTurns(2, 1), 4);
  assert.equal(calculateAttackTurns(3, 1), 6);
});

test('Attack suma turnos pendientes solo cuando son mayores que uno', () => {
  assert.equal(calculateAttackTurns(1, 0), 2);
  assert.equal(calculateAttackTurns(1, 1), 2);
  assert.equal(calculateAttackTurns(1, 2), 4);
  assert.equal(calculateAttackTurns(2, 3), 7);
});

test('advanceTurnAfterDraw consume un turno pendiente sin cambiar de jugador', () => {
  const state = game();
  state.turnsRemaining = 3;

  advanceTurnAfterDraw(state);

  assert.equal(state.currentPlayer, 0);
  assert.equal(state.turnsRemaining, 2);
  assert.equal(state.phase, TurnPhase.DRAW);
});

test('advanceTurnAfterDraw cambia al siguiente jugador cuando no quedan turnos', () => {
  const state = game();

  advanceTurnAfterDraw(state);

  assert.equal(state.currentPlayer, 1);
  assert.equal(state.turnsRemaining, 1);
  assert.equal(state.turn, 2);
  assert.equal(state.phase, TurnPhase.DRAW);
});
