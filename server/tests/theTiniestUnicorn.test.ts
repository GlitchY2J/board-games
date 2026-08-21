import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isImmuneToUnicornOrUpgradeDestruction } from '../src/game/cards/effects/theTiniestUnicorn.ts';
import { hasUnicornOfDeathTarget } from '../src/game/cards/effects/unicornOfDeath.ts';
import { getHandLimit } from '../src/game/cards/effects/unicornOfFamine.ts';
import { unicornOfPestilence } from '../src/game/cards/effects/unicornOfPestilence.ts';

test('The Tiniest Unicorn es inmune a destrucciones de Unicornio o Upgrade', () => {
  assert.equal(isImmuneToUnicornOrUpgradeDestruction('the_tiniest_unicorn'), true);
  assert.equal(isImmuneToUnicornOrUpgradeDestruction('basic_unicorn_red'), false);
  assert.equal(isImmuneToUnicornOrUpgradeDestruction('magical_kittencorn'), false);
});

test('Unicorn of Death solo considera objetivos unicornio de otros establos', () => {
  const state = {
    players: [
      {
        id: 'player-1',
        stable: [{ id: 'unicorn_of_death', cardType: 'unicorn' }],
        upgrades: [],
        downgrades: [],
      },
      {
        id: 'player-2',
        stable: [{ id: 'basic_unicorn_red', cardType: 'unicorn' }],
        upgrades: [],
        downgrades: [],
      },
    ],
  } as never;

  assert.equal(hasUnicornOfDeathTarget(state, 'player-1'), true);
});

test('Unicorn of Famine reduce el límite de mano de todos los jugadores', () => {
  const state = {
    players: [
      { stable: [{ id: 'unicorn_of_famine' }] },
      { stable: [] },
    ],
  } as never;

  assert.equal(getHandLimit(state), 2);
  assert.equal(getHandLimit({ players: [{ stable: [] }] } as never), 7);
});

test('Unicorn of Pestilence permite elegir cualquier cantidad de cartas, incluyendo cero', () => {
  const state = { pendingAction: undefined } as never;
  const player = {
    id: 'player-1',
    hand: [{ uid: 'card-1' }, { uid: 'card-2' }],
  } as never;

  unicornOfPestilence.onEnterStable?.(state, player, {} as never);

  assert.deepEqual(state.pendingAction, {
    type: 'select_discard_count',
    reason: 'unicorn_of_pestilence',
    playerId: 'player-1',
    maxCards: 2,
  });
});
