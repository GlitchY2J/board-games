import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CardRepository } from '../src/game/unstable-unicorns/CardRepository.ts';
import type { Card } from '../src/game/models/Card.ts';
import type { GameState } from '../src/game/models/GameState.ts';
import type { Player } from '../src/game/models/Player.ts';
import { TurnPhase } from '../src/game/turn/TurnPhase.ts';
import { ActionResolver } from '../src/game/unstable-unicorns/engine/ActionResolver.ts';
import { unicornSlasher } from '../src/game/cards/effects/unicornSlasher.ts';

let sequence = 0;

function card(id: string): Card {
  const found = CardRepository.load(['nightmares']).find(
    (candidate) => candidate.id === id,
  );
  if (!found) throw new Error(`Carta no encontrada: ${id}`);
  sequence += 1;
  return { ...found, uid: `${id}__unicorn_slasher_test${sequence}` };
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

function state(players: Player[]): GameState {
  return {
    roomCode: 'test',
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

test('Unicorn Slasher no ofrece el efecto si el jugador no tiene cartas para descartar', () => {
  const source = player('A');
  source.stable = [card('unicorn_slasher')];
  const game = state([source, player('B')]);

  unicornSlasher.onEnterStable?.(game, source, source.stable[0]);

  assert.equal(game.pendingAction, undefined);
});

test('Unicorn Slasher termina después del descarte si no hay cartas en establos para remover', () => {
  const source = player('A');
  source.hand = [card('basic_unicorn_red')];
  const game = state([source, player('B')]);

  unicornSlasher.onEnterStable?.(game, source, card('unicorn_slasher'));
  assert.equal(game.pendingAction?.type, 'select_choice');
  assert.equal(game.pendingAction?.reason, 'unicorn_slasher');

  game.pendingAction = {
    type: 'discard',
    reason: 'unicorn_slasher',
    playerId: source.id,
    cardsToDiscard: 1,
  };

  const resolved = ActionResolver.handleDiscard(game, source.id, [source.hand[0].uid]);

  assert.equal(resolved, true);
  assert.equal(source.hand.length, 0);
  assert.equal(game.discard.length, 1);
  assert.equal(game.pendingAction, undefined);
});
