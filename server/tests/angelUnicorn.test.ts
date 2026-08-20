import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CardRepository } from '../src/game/unstable-unicorns/CardRepository.ts';
import type { GameState } from '../src/game/models/GameState.ts';
import type { Player } from '../src/game/models/Player.ts';
import type { Card } from '../src/game/models/Card.ts';
import { TurnPhase } from '../src/game/turn/TurnPhase.ts';
import { TurnManager } from '../src/game/turn/TurnManager.ts';

let n = 0;
function card(id: string): Card {
  const c = CardRepository.load(['rainbow_apocalypse']).find((x) => x.id === id);
  if (!c) throw new Error(`carta no encontrada: ${id}`);
  n += 1;
  return { ...c, uid: `${id}__test${n}` };
}

function makePlayer(id: string, name: string): Player {
  return {
    id,
    sessionToken: id,
    socketId: id,
    connected: true,
    name,
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
    deck: [card('basic_unicorn_red')],
    nursery: [],
    discard: [],
    phase: TurnPhase.BEGINNING,
    pendingAction: undefined,
    actionUsed: false,
    log: [],
  };
}

test('Angel Unicorn: se activa al inicio del turno si hay unicornios en el descarte', () => {
  const angel = card('angel_unicorn');
  const targetUnicorn = card('basic_unicorn_blue');

  const p1 = makePlayer('p1', 'Player 1');
  p1.stable = [angel];

  const state = makeGame([p1]);
  state.discard = [targetUnicorn];

  // Activa triggers de inicio de turno
  TurnManager.activateBeginningTriggers(state);

  assert.equal(state.pendingAction?.type, 'select_choice');
  if (state.pendingAction?.type === 'select_choice') {
    assert.equal(state.pendingAction.reason, 'angel_unicorn');
  }
});

test('Angel Unicorn: NO se activa si el descarte NO tiene unicornios', () => {
  const angel = card('angel_unicorn');
  const magicCard = card('change_of_luck');

  const p1 = makePlayer('p1', 'Player 1');
  p1.stable = [angel];

  const state = makeGame([p1]);
  state.discard = [magicCard];

  // Intenta activar triggers de inicio de turno
  TurnManager.activateBeginningTriggers(state);
  TurnManager.skipBeginningIfNoTriggers(state);

  // Como no hay unicornios en descarte, debe pasar automáticamente a DRAW
  assert.equal(state.phase, TurnPhase.DRAW);
  assert.equal(state.pendingAction, undefined);
});
