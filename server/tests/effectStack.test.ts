import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CardRepository } from '../src/game/unstable-unicorns/CardRepository.ts';
import type { GameState } from '../src/game/models/GameState.ts';
import type { Player } from '../src/game/models/Player.ts';
import type { Card } from '../src/game/models/Card.ts';
import type { PendingAction } from '../src/game/models/PendingAction.ts';
import { TurnPhase } from '../src/game/turn/TurnPhase.ts';
import { RulesEngine } from '../src/game/unstable-unicorns/engine/RulesEngine.ts';
import { ActionResolver } from '../src/game/unstable-unicorns/engine/ActionResolver.ts';
import { CardMovement } from '../src/game/unstable-unicorns/engine/CardMovement.ts';
import { EffectStack } from '../src/game/unstable-unicorns/engine/EffectStack.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers para construir un GameState controlado (sin aleatoriedad)
// ─────────────────────────────────────────────────────────────────────────────

let n = 0;
function card(id: string): Card {
  const c = CardRepository.load().find((x) => x.id === id);
  if (!c) throw new Error(`carta no encontrada: ${id}`);
  n += 1;
  return { ...c, uid: `${id}__test${n}` };
}

function makePlayer(id: string, name: string): Player {
  return {
    id,
    sessionToken: id,
    socketId: null,
    connected: true,
    name,
    avatar: '',
    hand: [],
    stable: [],
    upgrades: [],
    downgrades: [],
  };
}

function makeGame(players: Player[], nursery: Card[]): GameState {
  return {
    roomCode: 'test',
    started: true,
    turn: 1,
    currentPlayer: 0,
    players,
    deck: [],
    nursery,
    discard: [],
    phase: TurnPhase.ACTION,
    pendingAction: undefined,
    actionUsed: false,
    log: [],
  };
}

function reason(state: GameState): string {
  const p = state.pendingAction;
  assert.ok(p, 'se esperaba un pendingAction activo');
  if ('reason' in p) return p.reason;
  if ('phase' in p) return `${p.type}:${p.phase}`;
  return p.type;
}

function playerId(state: GameState): string | undefined {
  const p = state.pendingAction;
  if (!p) return undefined;
  return 'playerId' in p ? p.playerId : undefined;
}

/**
 * Reproduce el desapilado LIFO del emisor real
 * (gameStateEmitter.ts): cuando no hay pendingAction, se reanuda la
 * continuación suspendida más reciente.
 */
function drainResume(state: GameState): void {
  while (!state.pendingAction && state.pendingResume?.length) {
    state.pendingAction = state.pendingResume.pop();
  }
}

function resolveChoice(
  state: GameState,
  who: string,
  choice: string,
): void {
  const p = state.pendingAction;
  assert.ok(p && p.type === 'select_choice' && p.playerId === who);
  if (p.reason === 'seductive_unicorn') {
    state.pendingAction = choice === 'yes'
      ? { type: 'discard', reason: 'seductive_unicorn', playerId: who, cardsToDiscard: 1 }
      : undefined;
  } else if (p.reason === 'mother_goose_unicorn') {
    if (choice === 'yes') {
      const hasBaby = state.nursery.some(
        (c) => c.cardType === 'unicorn' && c.unicornClass === 'baby',
      );
      state.pendingAction = hasBaby
        ? { type: 'select_nursery_card', reason: 'mother_goose_unicorn', playerId: who }
        : undefined;
    } else {
      state.pendingAction = undefined;
    }
  } else if (p.reason === 'stabby_the_unicorn') {
    state.pendingAction = choice === 'yes'
      ? { type: 'select_stable_card', reason: 'stabby_the_unicorn', sourcePlayerId: who }
      : undefined;
  } else {
    throw new Error(`choice sin soportar en el harness: ${p.reason}`);
  }
  drainResume(state);
}

function selectPlayer(state: GameState, who: string, target: string): void {
  assert.ok(ActionResolver.handleSelectPlayer(state, who, target));
  drainResume(state);
}

function selectStable(state: GameState, who: string, uid: string): void {
  assert.ok(ActionResolver.handleSelectStableCard(state, who, uid));
  drainResume(state);
}

function discard(state: GameState, who: string, uids: string[]): void {
  assert.ok(ActionResolver.handleDiscard(state, who, uids));
  drainResume(state);
}

function selectNursery(state: GameState, who: string, uid: string): void {
  const p = state.pendingAction;
  assert.ok(
    p && p.type === 'select_nursery_card' && p.playerId === who && p.reason === 'mother_goose_unicorn',
  );
  const idx = state.nursery.findIndex((c) => c.uid === uid);
  assert.notEqual(idx, -1, 'el baby debe estar en la nursery');
  const [baby] = state.nursery.splice(idx, 1);
  const player = state.players.find((pl) => pl.id === who)!;
  state.pendingAction = undefined;
  CardMovement.enterStable(state, player, baby);
  drainResume(state);
}

function playMagic(state: GameState, who: string, magic: Card): void {
  const res = RulesEngine.resolvePlay(state, who, magic);
  assert.ok(res.success, `no se pudo jugar ${magic.id}`);
  drainResume(state);
}

function uids(stable: Card[]): string[] {
  return stable.map((c) => c.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Prueba 1: el ejemplo exacto del usuario
// "unicorn swap → seductive unicorn → mother goose unicorn" en orden LIFO.
// ─────────────────────────────────────────────────────────────────────────────
test('unicorn swap + seductive + mother goose se resuelven en orden LIFO', () => {
  const seductive = card('seductive_unicorn');
  const basic = card('basic_unicorn_red');
  const motherGoose = card('mother_goose_unicorn');
  const swap = card('unicorn_swap');
  const discardable = card('two_for_one');
  const baby1 = card('baby_unicorn_red');
  const baby2 = card('baby_unicorn_red');

  const A = makePlayer('A', 'Ana');
  const B = makePlayer('B', 'Beto');
  const C = makePlayer('C', 'Caro');

  A.stable = [seductive, basic];
  A.hand = [swap];
  B.stable = [card('basic_unicorn_red')];
  B.hand = [discardable];
  C.stable = [motherGoose];

  const state = makeGame([A, B, C], [baby1, baby2]);

  // 1) A juega Unicorn Swap → elige a B
  playMagic(state, 'A', swap);
  assert.equal(reason(state), 'unicorn_swap');
  selectPlayer(state, 'A', 'B');
  assert.equal(reason(state), 'unicorn_swap_give');

  // 2) A mueve Seductive Unicorn de su establo al de B
  selectStable(state, 'A', seductive.uid);
  assert.equal(reason(state), 'seductive_unicorn');
  assert.equal(playerId(state), 'B');
  // El paso de robo del swap quedó SUSPENDIDO en la pila LIFO.
  assert.equal(state.pendingResume?.length, 1);

  // 3) B acepta el efecto de Seductive Unicorn → descarta una carta
  resolveChoice(state, 'B', 'yes');
  assert.equal(reason(state), 'seductive_unicorn'); // discard
  assert.equal(state.pendingAction?.type, 'discard');
  discard(state, 'B', [discardable.uid]);
  assert.equal(reason(state), 'seductive_unicorn'); // select_stable_card
  assert.equal(state.pendingAction?.type, 'select_stable_card');

  // 4) B roba Mother Goose Unicorn del establo de C
  selectStable(state, 'B', motherGoose.uid);
  // Mother Goose disparó su propio efecto al ENTRAR al establo de B.
  assert.equal(reason(state), 'mother_goose_unicorn');
  assert.equal(playerId(state), 'B');
  // El paso de robo del swap SIGUE suspendido (aún no se reanuda).
  assert.equal(state.pendingResume?.length, 1);

  // 5) B trae un baby de la nursery por Mother Goose
  resolveChoice(state, 'B', 'yes');
  assert.equal(reason(state), 'mother_goose_unicorn'); // select_nursery_card
  assert.equal(state.pendingAction?.type, 'select_nursery_card');
  selectNursery(state, 'B', baby1.uid);

  // 6) El efecto de Mother Goose terminó → se reanuda el paso suspendido del swap (LIFO)
  assert.equal(reason(state), 'unicorn_swap_steal');
  assert.equal(state.pendingResume?.length ?? 0, 0);

  // 7) A (el que jugó el swap) roba Mother Goose del establo de B
  selectStable(state, 'A', motherGoose.uid);
  assert.equal(reason(state), 'mother_goose_unicorn');
  assert.equal(playerId(state), 'A');

  // 8) Mother Goose vuelve a activarse: A trae otro baby
  resolveChoice(state, 'A', 'yes');
  assert.equal(reason(state), 'mother_goose_unicorn'); // select_nursery_card
  selectNursery(state, 'A', baby2.uid);

  // 9) Todo resuelto: sin acciones pendientes y sin continuaciones.
  assert.equal(state.pendingAction, undefined);
  assert.equal(state.pendingResume?.length ?? 0, 0);

  // Estado final del tablero
  assert.ok(uids(A.stable).includes('mother_goose_unicorn'));
  assert.ok(uids(A.stable).includes('baby_unicorn_red'));
  assert.ok(!uids(A.stable).includes('seductive_unicorn'), 'A ya no tiene a Seductive');

  assert.ok(uids(B.stable).includes('seductive_unicorn'), 'B recibió a Seductive');
  assert.ok(uids(B.stable).includes('baby_unicorn_red'), 'B recibió un baby por Mother Goose');
  assert.ok(!uids(B.stable).includes('mother_goose_unicorn'), 'B perdió a Mother Goose por el swap');

  assert.ok(!uids(C.stable).includes('mother_goose_unicorn'), 'C perdió a Mother Goose');
  assert.equal(state.nursery.length, 0, 'ambos babies fueron usados');
});

// ─────────────────────────────────────────────────────────────────────────────
// Prueba 2: Two For One sacrifica a Stabby The Unicorn → su onDestroyed abre un
// efecto hijo → Two For One se SUSPENDE y se reanuda después (LIFO por destroyOrSacrifice).
// ─────────────────────────────────────────────────────────────────────────────
test('Two For One sacrifica a Stabby, su efecto hijo se resuelve primero y luego se reanuda', () => {
  const twoForOne = card('two_for_one');
  const stabby = card('stabby_the_unicorn');
  const aUnicorn = card('basic_unicorn_red');
  const b1 = card('basic_unicorn_red');
  const b2 = card('basic_unicorn_red');
  const b3 = card('basic_unicorn_red');

  const A = makePlayer('A', 'Ana');
  const B = makePlayer('B', 'Beto');
  A.stable = [stabby, aUnicorn];
  A.hand = [twoForOne];
  B.stable = [b1, b2, b3];

  const state = makeGame([A, B], []);

  playMagic(state, 'A', twoForOne);
  assert.equal(reason(state), 'two_for_one:sacrifice');

  // A sacrifica a Stabby → Stabby abre su propio efecto hijo (destruir un unicornio)
  selectStable(state, 'A', stabby.uid);
  assert.equal(reason(state), 'stabby_the_unicorn');
  assert.equal(playerId(state), 'A');
  // La fase 'destroy' de Two For One quedó SUSPENDIDA en la pila LIFO.
  assert.equal(state.pendingResume?.length, 1);

  // Stabby destruye un unicornio de B
  resolveChoice(state, 'A', 'yes');
  assert.equal(reason(state), 'stabby_the_unicorn'); // select_stable_card
  selectStable(state, 'A', b1.uid);

  // El efecto de Stabby terminó → Two For One reanuda su fase 'destroy' (LIFO)
  assert.equal(reason(state), 'two_for_one:destroy');
  assert.equal(state.pendingResume?.length ?? 0, 0);

  // A destruye 2 cartas más
  selectStable(state, 'A', [b2.uid, b3.uid]);
  assert.equal(state.pendingAction, undefined);
  assert.equal(state.pendingResume?.length ?? 0, 0);

  // A perdió a Stabby (sacrificado); B perdió sus 3 unicornios.
  assert.ok(!uids(A.stable).includes('stabby_the_unicorn'));
  assert.ok(uids(A.stable).includes('basic_unicorn_red'));
  assert.equal(B.stable.length, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Prueba 3: unidad del EffectStack (childOpened / suspend / resume / finish / advance)
// ─────────────────────────────────────────────────────────────────────────────
test('EffectStack: semántica LIFO de childOpened / suspend / resume / finish / advance', () => {
  const A = makePlayer('A', 'Ana');
  const state = makeGame([A], []);
  const parent: PendingAction = { type: 'discard', reason: 'hand_limit', playerId: 'A', cardsToDiscard: 1 };
  const next: PendingAction = { type: 'discard', reason: 'barbed_wire', playerId: 'A', cardsToDiscard: 1 };
  const child: PendingAction = { type: 'select_choice', reason: 'mother_goose_unicorn', playerId: 'A', title: '', description: '', options: [] };
  const later: PendingAction = { type: 'discard', reason: 'seductive_unicorn', playerId: 'A', cardsToDiscard: 1 };

  // Caso 1: no se abrió un hijo → advance activa `next` directamente (sin suspender).
  state.pendingAction = parent;
  EffectStack.advance(state, parent, next);
  assert.equal(state.pendingAction, next);
  assert.equal(state.pendingResume?.length ?? 0, 0);

  // Caso 2: al resolver `next` un efecto hijo abrió su propio pendingAction.
  state.pendingAction = child;
  assert.equal(EffectStack.childOpened(state, next), true);

  // Con un hijo activo, advance SUSPENDE el siguiente paso en la pila LIFO.
  EffectStack.advance(state, next, later);
  assert.equal(state.pendingAction, child, 'el hijo sigue activo');
  assert.equal(state.pendingResume?.length, 1);
  assert.equal(state.pendingResume![0], later);

  // finish con hijo activo NO limpia el pendingAction.
  EffectStack.finish(state, next);
  assert.equal(state.pendingAction, child);

  // El hijo termina (pendingAction vacío) → resume desapila el paso suspendido (LIFO).
  state.pendingAction = undefined;
  const resumed = EffectStack.resume(state);
  assert.equal(resumed, later);
  state.pendingAction = resumed;

  // finish sin hijo limpia el pendingAction.
  EffectStack.finish(state, later);
  assert.equal(state.pendingAction, undefined);
  assert.equal(state.pendingResume?.length ?? 0, 0);
});