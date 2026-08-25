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
  return { ...source, uid: `${id}__glitter-${sequence}` };
}

function player(): Player {
  return {
    id: 'player',
    sessionToken: 'player',
    socketId: 'player',
    connected: true,
    name: 'Player',
    avatar: '',
    hand: [],
    stable: [],
    upgrades: [],
    downgrades: [],
  };
}

function game(activePlayer: Player): GameState {
  return {
    roomCode: 'glitter-test',
    started: true,
    turn: 1,
    currentPlayer: 0,
    players: [activePlayer],
    deck: [],
    nursery: [],
    discard: [],
    phase: TurnPhase.ACTION,
    pendingAction: undefined,
    actionUsed: false,
    log: [],
  };
}

test('Glitter Unicorn: permite colocar un Upgrade de la mano al entrar', () => {
  const activePlayer = player();
  const glitter = card('glitter_unicorn');
  const upgrade = card('rainbow_aura');
  activePlayer.hand = [upgrade];
  const state = game(activePlayer);

  CardMovement.enterStable(state, activePlayer, glitter);
  assert.equal(state.pendingAction?.type, 'select_hand_card');
  assert.equal(state.pendingAction?.reason, 'glitter_unicorn');

  assert.equal(
    ActionResolver.handleSelectHandCard(state, activePlayer.id, upgrade.uid),
    true,
  );
  assert.equal(state.pendingAction, undefined);
  assert.equal(activePlayer.hand.length, 0);
  assert.equal(activePlayer.upgrades[0].uid, upgrade.uid);
});
