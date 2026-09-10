import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gameRegistry } from '../src/games/catalog.ts';
import { ActionResolver } from '../src/game/unstable-unicorns/engine/ActionResolver.ts';
import type { GameState } from '../src/game/models/GameState.ts';
import type { Player } from '../src/game/models/Player.ts';
import { TurnPhase } from '../src/game/turn/TurnPhase.ts';

function player(id: string): Player {
  return {
    id,
    sessionToken: `${id}-session`,
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

function gameState(players: Player[]): GameState {
  return {
    roomCode: 'integration',
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

test('una acción pendiente no puede resolverse desde otro jugador', () => {
  const state = gameState([player('source'), player('target')]);
  state.pendingAction = {
    type: 'discard',
    reason: 'hand_limit',
    playerId: 'source',
    cardsToDiscard: 1,
  };

  assert.equal(ActionResolver.handleDiscard(state, 'target', []), false);
  assert.equal(state.pendingAction?.type, 'discard');
});

test('GameRegistry mantiene motores independientes por juego', () => {
  const unicornEngine = gameRegistry.getEngine('unstable-unicorns');
  const kittensEngine = gameRegistry.getEngine('exploding-kittens');

  assert.ok(unicornEngine);
  assert.ok(kittensEngine);
  assert.notEqual(unicornEngine, kittensEngine);

  const room = {
    code: 'ENGINE',
    hostId: 'source',
    players: [player('source'), player('target')],
    chat: [],
    settings: {
      gameId: 'unstable-unicorns' as const,
      versionId: 'unstable-unicorns-base',
      expansionIds: [],
    },
  };
  const unicornState = unicornEngine.createState(room);
  const kittenState = kittensEngine.createState({
    ...room,
    settings: {
      gameId: 'exploding-kittens',
      versionId: 'exploding-kittens-base',
      expansionIds: [],
    },
  });

  assert.notEqual(unicornState.deck.length, kittenState.deck.length);
  assert.equal(unicornState.roomCode, 'ENGINE');
  assert.equal(kittenState.roomCode, 'ENGINE');
});
