import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CardRepository } from '../src/game/unstable-unicorns/CardRepository.ts';
import type { Card } from '../src/game/models/Card.ts';
import type { GameState } from '../src/game/models/GameState.ts';
import type { Player } from '../src/game/models/Player.ts';
import { CardMovement } from '../src/game/unstable-unicorns/engine/CardMovement.ts';
import { ActionResolver } from '../src/game/unstable-unicorns/engine/ActionResolver.ts';
import { TurnPhase } from '../src/game/turn/TurnPhase.ts';

let sequence = 0;

function card(id: string): Card {
  const source = CardRepository.load(['rainbow_apocalypse']).find(
    (candidate) => candidate.id === id,
  );
  if (!source) throw new Error(`Carta no encontrada: ${id}`);
  sequence += 1;
  return { ...source, uid: `${id}__frenchiecorn-${sequence}` };
}

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

function game(players: Player[]): GameState {
  return {
    roomCode: 'frenchiecorn-test',
    started: true,
    turn: 1,
    currentPlayer: 0,
    players,
    deck: [],
    nursery: [],
    discard: [],
    phase: TurnPhase.ACTION,
    pendingAction: undefined,
    actionUsed: false,
    log: [],
  };
}

test('Frenchiecorn: los rivales descartan y su dueño puede recuperar una de esas cartas', () => {
  const source = player('source');
  const rivalOne = player('rival-one');
  const rivalTwo = player('rival-two');
  const frenchie = card('frenchiecorn');
  const discardedOne = card('basic_unicorn_red');
  const discardedTwo = card('basic_unicorn_blue');

  source.stable = [frenchie];
  rivalOne.hand = [discardedOne];
  rivalTwo.hand = [discardedTwo];
  const state = game([source, rivalOne, rivalTwo]);

  CardMovement.enterStable(state, source, frenchie);
  assert.equal(state.pendingAction?.type, 'frenchiecorn');

  assert.equal(
    ActionResolver.handleFrenchiecornDiscard(state, rivalOne.id, [discardedOne.uid]),
    true,
  );
  assert.equal(state.pendingAction?.type, 'frenchiecorn');

  assert.equal(
    ActionResolver.handleFrenchiecornDiscard(state, rivalTwo.id, [discardedTwo.uid]),
    true,
  );
  assert.equal(state.pendingAction?.type, 'select_discard_card');

  if (state.pendingAction?.type === 'select_discard_card') {
    assert.equal(state.pendingAction.reason, 'frenchiecorn');
    assert.deepEqual(state.pendingAction.discardedCardIds, [
      discardedOne.uid,
      discardedTwo.uid,
    ]);
    assert.equal(state.pendingAction.playerId, source.id);
  }
});
