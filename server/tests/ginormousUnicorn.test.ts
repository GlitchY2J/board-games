import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CardRepository } from '../src/game/unstable-unicorns/CardRepository.ts';
import type { GameState } from '../src/game/models/GameState.ts';
import type { Player } from '../src/game/models/Player.ts';
import type { Card } from '../src/game/models/Card.ts';
import { TurnPhase } from '../src/game/turn/TurnPhase.ts';
import { getStablePower } from '../src/game/unstable-unicorns/engine/stablePower.ts';
import { hasBlindingLight } from '../src/game/cards/effects/blindingLight.ts';

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

test('Ginormous Unicorn sin Blinding Light cuenta como 2 unicornios', () => {
  const p = makePlayer('A');
  p.stable = [card('ginormous_unicorn'), card('baby_unicorn_red')];
  assert.equal(getStablePower(p), 3, '1 Ginormous (2) + 1 Baby (1) = 3');
});

test('Ginormous Unicorn con Blinding Light cuenta como 1 unicornio básico', () => {
  const p = makePlayer('A');
  p.stable = [card('ginormous_unicorn'), card('baby_unicorn_red')];
  p.downgrades = [card('blinding_light')];
  assert.equal(hasBlindingLight(p), true);
  assert.equal(getStablePower(p), 2, '1 Ginormous (1 por Blinding Light) + 1 Baby (1) = 2');
});
