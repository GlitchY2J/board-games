import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isImmuneToUnicornOrUpgradeDestruction } from '../src/game/cards/effects/theTiniestUnicorn.ts';

test('The Tiniest Unicorn es inmune a destrucciones de Unicornio o Upgrade', () => {
  assert.equal(isImmuneToUnicornOrUpgradeDestruction('the_tiniest_unicorn'), true);
  assert.equal(isImmuneToUnicornOrUpgradeDestruction('basic_unicorn_red'), false);
  assert.equal(isImmuneToUnicornOrUpgradeDestruction('magical_kittencorn'), false);
});
