import { backKick } from '../../../cards/effects/backKick.ts';
import { changeOfLuck } from '../../../cards/effects/changeOfLuck.ts';
import { blatantThievery } from '../../../cards/effects/blatantThievery.ts';
import { glitterTornado } from '../../../cards/effects/glitterTornado.ts';
import { AlluringNarwhal } from './unicorn/AlluringNarwhal.ts';
import type { CardEffect } from './CardEffect.ts';

export const effects: Record<string, CardEffect> = {
  alluring_narwhal: AlluringNarwhal,
  changeOfLuck,
  backKick,
  blatant_thievery: blatantThievery,
  glitter_tornado: glitterTornado,
};
