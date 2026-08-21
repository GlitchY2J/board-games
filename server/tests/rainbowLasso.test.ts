import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CardRepository } from '../src/game/unstable-unicorns/CardRepository.ts';
import type { Card } from '../src/game/models/Card.ts';
import type { GameState } from '../src/game/models/GameState.ts';
import type { Player } from '../src/game/models/Player.ts';
import { TurnManager } from '../src/game/turn/TurnManager.ts';
import { TurnPhase } from '../src/game/turn/TurnPhase.ts';

let sequence = 0;

function card(id: string): Card {
  const source = CardRepository.load().find((candidate) => candidate.id === id);
  if (!source) throw new Error(`Carta no encontrada: ${id}`);
  sequence += 1;
  return { ...source, uid: `${id}__rainbow-lasso-${sequence}` };
}

function player(id: string): Player {
  return {
    id,
    sessionToken: id,
    socketId: null,
    connected: true,
    name: id,
    avatar: '',
    hand: [],
    stable: [],
    upgrades: [],
    downgrades: [],
  };
}

function game(players: Player[]): GameState {
  return {
    roomCode: 'rainbow-lasso-test',
    started: true,
    turn: 1,
    currentPlayer: 0,
    players,
    deck: [],
    nursery: [],
    discard: [],
    phase: TurnPhase.BEGINNING,
    pendingAction: undefined,
    beginningEffectsQueue: [],
    actionUsed: false,
    log: [],
  };
}

test('Rainbow Lasso no vuelve a presentarse tras resolver una interacción hija', () => {
  const active = player('active');
  const opponent = player('opponent');
  const lasso = card('rainbow_lasso');
  active.upgrades.push(lasso);

  const state = game([active, opponent]);
  state.beginningEffectsQueue = [lasso.uid];

  assert.equal(TurnManager.startBeginningEffect(state, lasso.uid), true);
  assert.deepEqual(state.beginningEffectsQueue, []);

  // Simula que el efecto hijo del unicornio robado acaba de terminar.
  state.pendingAction = undefined;
  TurnManager.processBeginningQueue(state);

  assert.equal(state.pendingAction, undefined);
  assert.equal(state.phase, TurnPhase.DRAW);

  // Una llamada posterior no debe reconstruir la cola durante el mismo inicio.
  state.phase = TurnPhase.BEGINNING;
  assert.equal(TurnManager.activateBeginningTriggers(state), false);
  assert.equal(state.pendingAction, undefined);
});
