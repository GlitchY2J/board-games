import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { GameState } from '../src/game/models/GameState.ts';
import type { Player } from '../src/game/models/Player.ts';
import type { Card } from '../src/game/models/Card.ts';
import { TurnPhase } from '../src/game/turn/TurnPhase.ts';
import {
  advanceTurnAfterDraw,
  beginExplodingKittenResolution,
  beginImplodingKittenResolution,
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

function card(id: string, cardType: Card['cardType'] = 'action'): Card {
  return {
    uid: `${id}__1`,
    id,
    name: id,
    cardType,
    image: '',
    description: '',
    effect: '',
    copies: 1,
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

test('un Exploding Kitten robado inicia su resolución y no avanza el turno', () => {
  const state = game();
  const drawn = card('exploding_kitten', 'exploding_kitten');
  state.players[0].hand.push(drawn);

  const activated = beginExplodingKittenResolution(state, state.players[0], drawn);

  assert.equal(activated, true);
  assert.equal(state.currentPlayer, 0);
  assert.equal(state.pendingAction?.type, 'exploding_kitten');
  assert.equal(state.pendingAction?.playerId, 'P1');
});

test('una carta normal robada no inicia una resolución de explosión', () => {
  const state = game();

  const activated = beginExplodingKittenResolution(
    state,
    state.players[0],
    card('skip'),
  );

  assert.equal(activated, false);
  assert.equal(state.pendingAction, undefined);
});

test('el primer encuentro con Imploding Kitten espera confirmación para reinsertarlo', () => {
  const state = game();
  const drawn = card('imploding_kitten');

  const stage = beginImplodingKittenResolution(state, state.players[0], drawn);

  assert.equal(stage, 'revealed');
  assert.equal(drawn.faceUp, true);
  assert.equal(state.pendingAction?.type, 'imploding_kitten');
  if (state.pendingAction?.type === 'imploding_kitten') {
    assert.equal(state.pendingAction.stage, 'revealed');
  }
  assert.equal(state.players.length, 3);
});

test('el segundo encuentro con Imploding Kitten espera confirmación antes de eliminar', () => {
  const state = game();
  const drawn = { ...card('imploding_kitten'), faceUp: true };

  const stage = beginImplodingKittenResolution(state, state.players[0], drawn);

  assert.equal(stage, 'eliminated');
  assert.equal(state.pendingAction?.type, 'imploding_kitten');
  if (state.pendingAction?.type === 'imploding_kitten') {
    assert.equal(state.pendingAction.stage, 'eliminated');
  }
  assert.equal(state.players.length, 3);
});
