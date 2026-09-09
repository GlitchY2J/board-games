import assert from 'node:assert/strict';
import { test } from 'node:test';
import { effects } from '../src/game/unstable-unicorns/engine/effects/index.ts';
import { nightmaresEffects } from '../src/game/unstable-unicorns/engine/effects/expansions/nightmares.ts';
import { rainbowApocalypseEffects } from '../src/game/unstable-unicorns/engine/effects/expansions/rainbowApocalypse.ts';

test('el catálogo de efectos compone las expansiones en el registro único', () => {
  for (const [id, effect] of Object.entries(rainbowApocalypseEffects)) {
    assert.equal(effects[id], effect);
  }
  for (const [id, effect] of Object.entries(nightmaresEffects)) {
    assert.equal(effects[id], effect);
  }
});
