import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CardRepository } from '../src/game/unstable-unicorns/CardRepository.ts';
import type { GameState } from '../src/game/models/GameState.ts';
import type { Player } from '../src/game/models/Player.ts';
import type { Card } from '../src/game/models/Card.ts';
import { TurnPhase } from '../src/game/turn/TurnPhase.ts';
import { RulesEngine } from '../src/game/unstable-unicorns/engine/RulesEngine.ts';
import { ActionResolver } from '../src/game/unstable-unicorns/engine/ActionResolver.ts';

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

// stagePlay es la capa de validación real (bloquear jugar) y luego resolvePlay
// ejecuta la jugada (mismo flujo que los sockets: play-card → neigh → resolve).

function playCode(state: GameState, who: string, c: Card): string | null {
  const res = RulesEngine.stagePlay(state, who, c.uid);
  return res.success ? null : res.error.code;
}

function playCard(state: GameState, who: string, c: Card): boolean {
  const staged = RulesEngine.stagePlay(state, who, c.uid);
  if (!staged.success) return false;
  const resolved = RulesEngine.resolvePlay(state, who, c);
  return resolved.success;
}

// Queen Bee impide que los unicornios básicos entren a establos ajenos, salvo
// que Blinding Light anule su efecto continuo.

test('Queen Bee: bloquea un básico en otro establo', () => {
  const B = makePlayer('B');
  const A = makePlayer('A');
  A.stable = [card('queen_bee_unicorn')];
  const basic = card('basic_unicorn_red');
  B.hand = [basic];
  const state = makeGame([B, A]);
  assert.equal(playCode(state, 'B', basic), 'ACTION_NOT_ALLOWED');
  assert.ok(B.hand.some((c) => c.uid === basic.uid), 'la carta debe seguir en mano');
});

test('Queen Bee + Blinding Light del dueño: otro jugador SÍ puede jugar básicos', () => {
  const B = makePlayer('B');
  const A = makePlayer('A');
  A.stable = [card('queen_bee_unicorn')];
  A.downgrades.push(card('blinding_light'));
  const basic = card('basic_unicorn_red');
  B.hand = [basic];
  const state = makeGame([B, A]);
  assert.ok(playCard(state, 'B', basic), 'debió jugar el básico');
  assert.ok(B.stable.some((c) => c.id === 'basic_unicorn_red'), 'el básico debió entrar');
});

test('Queen Bee: el dueño siempre puede jugar básicos', () => {
  const A = makePlayer('A');
  const B = makePlayer('B');
  A.stable = [card('queen_bee_unicorn')];
  const basic = card('basic_unicorn_red');
  A.hand = [basic];
  const state = makeGame([A, B]);
  assert.equal(playCode(state, 'A', basic), null);
  assert.ok(playCard(state, 'A', basic));
  assert.ok(A.stable.some((u) => u.id === 'basic_unicorn_red'));
});

test('Narwhal: se trata como unicornio básico y Queen Bee lo bloquea', () => {
  const B = makePlayer('B');
  const A = makePlayer('A');
  A.stable = [card('queen_bee_unicorn')];
  const narwhal = card('narwhal');
  assert.equal(narwhal.unicornClass, 'basic');
  B.hand = [narwhal];
  const state = makeGame([B, A]);
  assert.equal(playCode(state, 'B', narwhal), 'ACTION_NOT_ALLOWED');
});

test('Narwhal: entra a otro establo si Queen Bee está anulada por Blinding Light', () => {
  const B = makePlayer('B');
  const A = makePlayer('A');
  A.stable = [card('queen_bee_unicorn')];
  A.downgrades.push(card('blinding_light'));
  const narwhal = card('narwhal');
  B.hand = [narwhal];
  const state = makeGame([B, A]);
  assert.ok(playCard(state, 'B', narwhal));
  assert.ok(B.stable.some((u) => u.id === 'narwhal'));
});

test('Narwhal: es elegible como básico para Rainbow Unicorn', () => {
  const A = makePlayer('A');
  const rainbow = card('rainbow_unicorn');
  const narwhal = card('narwhal');
  A.hand = [rainbow, narwhal];
  const state = makeGame([A]);

  const resolved = RulesEngine.resolvePlay(state, 'A', rainbow);
  assert.equal(resolved.success, true);
  assert.equal(state.pendingAction?.reason, 'rainbow_unicorn');

  state.pendingAction = {
    type: 'select_own_hand_card',
    reason: 'rainbow_unicorn',
    playerId: 'A',
  };
  assert.ok(
    ActionResolver.handleSelectOwnHandCardToStable(state, 'A', narwhal.uid),
  );
  assert.ok(A.stable.some((u) => u.id === 'narwhal'));
});