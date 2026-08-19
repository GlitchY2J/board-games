import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CardRepository } from '../src/game/unstable-unicorns/CardRepository.ts';
import type { GameState } from '../src/game/models/GameState.ts';
import type { Player } from '../src/game/models/Player.ts';
import type { Card } from '../src/game/models/Card.ts';
import { TurnPhase } from '../src/game/turn/TurnPhase.ts';
import { RulesEngine } from '../src/game/unstable-unicorns/engine/RulesEngine.ts';
import { ActionResolver } from '../src/game/unstable-unicorns/engine/ActionResolver.ts';
import { CardMovement } from '../src/game/unstable-unicorns/engine/CardMovement.ts';

let n = 0;
function card(id: string): Card {
  const c = CardRepository.load().find((x) => x.id === id);
  if (!c) throw new Error(`carta no encontrada: ${id}`);
  n += 1;
  return { ...c, uid: `${id}__test${n}` };
}
function makePlayer(id: string): Player {
  return { id, sessionToken: id, socketId: null, connected: true, name: id, avatar: '', hand: [], stable: [], upgrades: [], downgrades: [] };
}
function makeGame(players: Player[]): GameState {
  return { roomCode: 'test', started: true, turn: 1, currentPlayer: 0, players, deck: [], nursery: [], discard: [], phase: TurnPhase.ACTION, pendingAction: undefined, actionUsed: false, log: [] };
}
function drainResume(state: GameState) {
  while (!state.pendingAction && state.pendingResume?.length) state.pendingAction = state.pendingResume.pop();
}
function playMagic(state: GameState, who: string, magic: Card) {
  const res = RulesEngine.resolvePlay(state, who, magic);
  assert.ok(res.success);
  drainResume(state);
}
function selectPlayer(state: GameState, who: string, target: string) {
  assert.ok(ActionResolver.handleSelectPlayer(state, who, target));
  drainResume(state);
}
function selectStable(state: GameState, who: string, uid: string) {
  assert.ok(ActionResolver.handleSelectStableCard(state, who, uid));
  drainResume(state);
}
function expectAlluring(state: GameState, ownerId: string) {
  const p = state.pendingAction;
  assert.ok(p && p.type === 'alluring_narwhal', `esperaba alluring_narwhal, se obtuvo ${JSON.stringify(p)}`);
  assert.equal(p.playerId, ownerId);
}

// El efecto de Alluring Narwhal (onEnterStable) debe dispararse al ENTRAR a un
// establo, sin importar el método: jugado, robado o movido entre establos.

test('Alluring Narwhal dispara al ser JUGADO (entra al establo)', () => {
  const A = makePlayer('A'); const B = makePlayer('B');
  const narwhal = card('alluring_narwhal');
  A.hand = [narwhal];
  B.upgrades.push(card('rainbow_lasso'));
  const state = makeGame([A, B]);
  playMagic(state, 'A', narwhal);
  expectAlluring(state, 'A');
});

test('Alluring Narwhal dispara al ser MOVIDO a otro establo (unicorn swap give)', () => {
  const A = makePlayer('A'); const B = makePlayer('B');
  const narwhal = card('alluring_narwhal');
  A.stable = [narwhal]; A.hand = [card('unicorn_swap')];
  A.upgrades.push(card('rainbow_lasso'));
  B.stable = [card('basic_unicorn_red')];
  const state = makeGame([A, B]);
  playMagic(state, 'A', A.hand[0]);
  selectPlayer(state, 'A', 'B');
  assert.equal(state.pendingAction?.reason, 'unicorn_swap_give');
  selectStable(state, 'A', narwhal.uid);
  expectAlluring(state, 'B');
});

test('Alluring Narwhal dispara al ser ROBADO de vuelta (unicorn swap steal)', () => {
  const A = makePlayer('A'); const B = makePlayer('B');
  const narwhal = card('alluring_narwhal');
  A.stable = [card('basic_unicorn_red')]; A.hand = [card('unicorn_swap')];
  B.stable = [narwhal]; B.upgrades.push(card('rainbow_lasso'));
  const state = makeGame([A, B]);
  playMagic(state, 'A', A.hand[0]);
  selectPlayer(state, 'A', 'B');
  assert.equal(state.pendingAction?.reason, 'unicorn_swap_give');
  selectStable(state, 'A', A.stable[0].uid);
  assert.equal(state.pendingAction?.reason, 'unicorn_swap_steal');
  selectStable(state, 'A', narwhal.uid);
  expectAlluring(state, 'A');
});

test('Alluring Narwhal dispara al ser ROBADO (seductive unicorn)', () => {
  const A = makePlayer('A'); const B = makePlayer('B'); const C = makePlayer('C');
  const narwhal = card('alluring_narwhal');
  C.stable = [narwhal];
  A.stable = [card('basic_unicorn_red')]; A.upgrades.push(card('rainbow_lasso'));
  const state = makeGame([A, B, C]);
  state.pendingAction = { type: 'select_stable_card', reason: 'seductive_unicorn', sourcePlayerId: 'B' };
  selectStable(state, 'B', narwhal.uid);
  expectAlluring(state, 'B');
});

test('Alluring Narwhal dispara al ser ROBADO (rainbow lasso)', () => {
  const A = makePlayer('A'); const B = makePlayer('B'); const C = makePlayer('C');
  const narwhal = card('alluring_narwhal');
  C.stable = [narwhal];
  A.stable = [card('basic_unicorn_red')]; A.upgrades.push(card('rainbow_lasso'));
  const state = makeGame([A, B, C]);
  state.pendingAction = { type: 'select_stable_card', reason: 'rainbow_lasso_steal', sourcePlayerId: 'B' };
  selectStable(state, 'B', narwhal.uid);
  expectAlluring(state, 'B');
});

test('Alluring Narwhal NO dispara si su establo tiene Blinding Light', () => {
  const A = makePlayer('A'); const B = makePlayer('B');
  const narwhal = card('alluring_narwhal');
  A.hand = [narwhal];
  A.downgrades.push(card('blinding_light'));
  B.upgrades.push(card('rainbow_lasso'));
  const state = makeGame([A, B]);
  playMagic(state, 'A', narwhal);
  assert.equal(state.pendingAction, undefined, 'Blinding Light bloquea el efecto on-enter');
});