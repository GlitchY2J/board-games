import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CardRepository } from '../src/game/unstable-unicorns/CardRepository.ts';
import type { GameState } from '../src/game/models/GameState.ts';
import type { Player } from '../src/game/models/Player.ts';
import type { Card } from '../src/game/models/Card.ts';
import { TurnPhase } from '../src/game/turn/TurnPhase.ts';
import { ActionResolver } from '../src/game/unstable-unicorns/engine/ActionResolver.ts';
import { changeOfLuck } from '../src/game/cards/effects/changeOfLuck.ts';

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
    deck: [
      card('basic_unicorn_red'),
      card('basic_unicorn_blue'),
      card('basic_unicorn_green'),
      card('basic_unicorn_yellow'),
    ],
    nursery: [],
    discard: [],
    phase: TurnPhase.ACTION,
    pendingAction: undefined,
    actionUsed: false,
    log: [],
  };
}

test('Change of Luck: roba 2 cartas, otorga turno extra y exige descartar 3', () => {
  const p1 = makePlayer('P1');
  const p2 = makePlayer('P2');
  p1.hand = [card('change_of_luck'), card('basic_unicorn_red')];
  const state = makeGame([p1, p2]);

  // Jugar Change of Luck
  changeOfLuck.onPlay?.(state, p1);

  assert.equal(state.extraTurn, true);
  assert.equal(state.pendingAction?.type, 'discard');
  assert.equal(state.pendingAction?.reason, 'change_of_luck');
  assert.equal(state.pendingAction?.cardsToDiscard, 3);
});

test('Change of Luck: tras descartar 3 cartas, inicia el turno extra y activa los efectos de inicio de turno', () => {
  const p1 = makePlayer('P1');
  const p2 = makePlayer('P2');
  const col = card('change_of_luck');
  const h1 = card('basic_unicorn_red');
  const h2 = card('basic_unicorn_blue');

  p1.hand = [col, h1, h2];
  p1.upgrades = [card('glitter_bomb')];
  p1.stable = [card('baby_unicorn_red')];
  p2.stable = [card('baby_unicorn_blue')];

  const state = makeGame([p1, p2]);

  changeOfLuck.onPlay?.(state, p1);

  // La mano ahora tiene h1, h2 + 2 robadas = 4 cartas. Descartar 3 cartas.
  const toDiscard = p1.hand.slice(0, 3).map((c) => c.uid);
  const resolved = ActionResolver.handleDiscard(state, p1.id, toDiscard);

  assert.equal(resolved, true);
  // El turno extra arrancó y activó Glitter Bomb
  assert.equal(state.currentPlayer, 0); // Sigue siendo P1 (turno extra)
  assert.equal(state.phase, TurnPhase.BEGINNING);
  assert.equal(state.pendingAction?.type, 'select_choice');
  assert.equal(state.pendingAction?.reason, 'glitter_bomb');
});

test('Change of Luck: si no hay efectos de inicio de turno, pasa a DRAW en el turno extra', () => {
  const p1 = makePlayer('P1');
  const p2 = makePlayer('P2');
  p1.hand = [card('change_of_luck'), card('basic_unicorn_red'), card('basic_unicorn_blue')];
  const state = makeGame([p1, p2]);

  changeOfLuck.onPlay?.(state, p1);

  const toDiscard = p1.hand.slice(0, 3).map((c) => c.uid);
  const resolved = ActionResolver.handleDiscard(state, p1.id, toDiscard);

  assert.equal(resolved, true);
  assert.equal(state.currentPlayer, 0);
  assert.equal(state.phase, TurnPhase.DRAW);
});
