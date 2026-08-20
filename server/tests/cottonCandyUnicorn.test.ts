import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CardRepository } from '../src/game/unstable-unicorns/CardRepository.ts';
import type { GameState } from '../src/game/models/GameState.ts';
import type { Player } from '../src/game/models/Player.ts';
import type { Card } from '../src/game/models/Card.ts';
import { TurnPhase } from '../src/game/turn/TurnPhase.ts';
import { CardMovement } from '../src/game/unstable-unicorns/engine/CardMovement.ts';
import { ActionResolver } from '../src/game/unstable-unicorns/engine/ActionResolver.ts';

let n = 0;
function card(id: string): Card {
  const c = CardRepository.load(['rainbow_apocalypse']).find(
    (x) => x.id === id || x.id === 'cotton_candy_llamacorn',
  );
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
    deck: [card('basic_unicorn_red'), card('basic_unicorn_blue')],
    nursery: [],
    discard: [],
    phase: TurnPhase.ACTION,
    pendingAction: undefined,
    actionUsed: false,
    log: [],
  };
}

test('Cotton Candy Unicorn: fuerza sacrificio de unicornio a todos y luego el dueño jala 1 carta', () => {
  const cotton = card('cotton_candy_llamacorn');
  const p1Card = card('basic_unicorn_red');
  const p2Card = card('basic_unicorn_blue');

  const p1 = makePlayer('p1', 'Player 1');
  p1.stable = [cotton, p1Card];
  const p2 = makePlayer('p2', 'Player 2');
  p2.stable = [p2Card];

  const state = makeGame([p1, p2]);

  CardMovement.enterStable(state, p1, cotton);

  assert.equal(state.pendingAction?.type, 'cotton_candy_unicorn');

  // P1 sacrifica p1Card
  const r1 = ActionResolver.handleSelectStableCard(state, 'p1', p1Card.uid);
  assert.equal(r1, true);
  assert.equal(p1.stable.some((c) => c.uid === p1Card.uid), false);

  // La acción pendiente sigue activa para P2
  assert.equal(state.pendingAction?.type, 'cotton_candy_unicorn');

  const initialHandSize = p1.hand.length;

  // P2 sacrifica p2Card
  const r2 = ActionResolver.handleSelectStableCard(state, 'p2', p2Card.uid);
  assert.equal(r2, true);
  assert.equal(p2.stable.some((c) => c.uid === p2Card.uid), false);

  // Terminaron todos los sacrificios -> P1 roba 1 carta
  assert.equal(state.pendingAction, undefined);
  assert.equal(p1.hand.length, initialHandSize + 1);
});
