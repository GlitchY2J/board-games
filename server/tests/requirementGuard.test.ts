import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CardRepository } from '../src/game/unstable-unicorns/CardRepository.ts';
import type { GameState } from '../src/game/models/GameState.ts';
import type { Player } from '../src/game/models/Player.ts';
import type { Card } from '../src/game/models/Card.ts';
import { TurnPhase } from '../src/game/turn/TurnPhase.ts';
import { RulesEngine } from '../src/game/unstable-unicorns/engine/RulesEngine.ts';

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
function play(state: GameState, who: string, c: Card) {
  const res = RulesEngine.resolvePlay(state, who, c);
  assert.ok(res.success);
  drainResume(state);
}

// Necromancer Unicorn exige DESCARTAR 2 unicornios. Durante onEnterStable la
// carta que se juega todavía está en la mano, así que no puede contar como una
// de las 2 requeridas. Si solo hay 1 unicornio adicional, NO se ofrece el efecto.

test('Necromancer: NO ofrece el efecto si tras jugarlo quedan menos de 2 unicornios en mano', () => {
  const A = makePlayer('A');
  const necro = card('necromancer_unicorn');
  A.hand = [necro, card('basic_unicorn_red')];
  const state = makeGame([A]);
  play(state, 'A', necro);
  assert.equal(state.pendingAction, undefined);
});

test('Necromancer: SÍ ofrece el efecto si quedan 2 unicornios descartables en mano', () => {
  const A = makePlayer('A');
  const necro = card('necromancer_unicorn');
  A.hand = [necro, card('basic_unicorn_red'), card('basic_unicorn_blue')];
  const state = makeGame([A]);
  state.discard.push(card('basic_unicorn_green'));
  play(state, 'A', necro);
  assert.equal(state.pendingAction?.reason, 'necromancer_unicorn');
});

test('Necromancer: NO ofrece el efecto si el descarte no tiene unicornios', () => {
  const A = makePlayer('A');
  const necro = card('necromancer_unicorn');
  A.hand = [necro, card('basic_unicorn_red'), card('basic_unicorn_blue')];
  const state = makeGame([A]);
  state.discard.push(card('back_kick'));
  play(state, 'A', necro);
  assert.equal(state.pendingAction, undefined);
});

// Seductive Unicorn exige DESCARTAR 1 carta de la mano. La carta que se juega
// no puede ser la que se descarta, así que con solo ella en mano no se ofrece.

test('Seductive: NO ofrece el efecto si tras jugarlo no queda nada que descartar', () => {
  const A = makePlayer('A'); const B = makePlayer('B');
  const sed = card('seductive_unicorn');
  A.hand = [sed];
  B.stable = [card('basic_unicorn_red')];
  const state = makeGame([A, B]);
  play(state, 'A', sed);
  assert.equal(state.pendingAction, undefined);
});

test('Seductive: SÍ ofrece el efecto si queda otra carta que descartar y hay a quién robar', () => {
  const A = makePlayer('A'); const B = makePlayer('B');
  const sed = card('seductive_unicorn');
  A.hand = [sed, card('back_kick')];
  B.stable = [card('basic_unicorn_red')];
  const state = makeGame([A, B]);
  play(state, 'A', sed);
  assert.equal(state.pendingAction?.reason, 'seductive_unicorn');
});
