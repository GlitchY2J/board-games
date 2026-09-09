import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameRegistry } from '../src/games/catalog.ts';

test('GameRegistry.validateSettings acepta una sala sin juego seleccionado', () => {
  assert.deepEqual(
    gameRegistry.validateSettings({
      gameId: null,
      versionId: null,
      expansionIds: [],
    }),
    { valid: true },
  );
});

test('GameRegistry.validateSettings rechaza versión sin juego', () => {
  const result = gameRegistry.validateSettings({
    gameId: null,
    versionId: 'unstable-unicorns-base',
    expansionIds: [],
  });

  assert.equal(result.valid, false);
  assert.equal(result.code, 'INVALID_ROOM_SETTINGS');
});

test('GameRegistry.validateSettings rechaza expansiones duplicadas', () => {
  const result = gameRegistry.validateSettings({
    gameId: 'unstable-unicorns',
    versionId: 'unstable-unicorns-base',
    expansionIds: ['rainbow_apocalypse', 'rainbow_apocalypse'],
  });

  assert.equal(result.valid, false);
  assert.equal(result.code, 'DUPLICATE_GAME_EXPANSION');
});

test('GameRegistry.validateSettings rechaza una expansión incompatible', () => {
  const result = gameRegistry.validateSettings({
    gameId: 'unstable-unicorns',
    versionId: 'unstable-unicorns-base',
    expansionIds: ['imploding_kittens'],
  });

  assert.equal(result.valid, false);
  assert.equal(result.code, 'INVALID_GAME_EXPANSION');
});

test('GameRegistry.validateSettings valida el límite de jugadores', () => {
  const result = gameRegistry.validateSettings(
    {
      gameId: 'unstable-unicorns',
      versionId: 'unstable-unicorns-base',
      expansionIds: [],
    },
    1,
  );

  assert.equal(result.valid, false);
  assert.equal(result.code, 'NOT_ENOUGH_PLAYERS');
});
