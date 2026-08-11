import { backKick } from '../../../cards/effects/backKick.ts';
import { changeOfLuck } from '../../../cards/effects/changeOfLuck.ts';
import { blatantThievery } from '../../../cards/effects/blatantThievery.ts';
import { glitterTornado } from '../../../cards/effects/glitterTornado.ts';
import { goodDeal } from '../../../cards/effects/goodDeal.ts';
import { mysticalVortex } from '../../../cards/effects/mysticalVortex.ts';
import { americorn } from '../../../cards/effects/americorn.ts';
import { unicornPoison } from '../../../cards/effects/unicornPoison.ts';
import { annoyingFlyingUnicorn } from '../../../cards/effects/annoyingFlyingUnicorn.ts';
import { chainsawUnicorn } from '../../../cards/effects/chainsawUnicorn.ts';
import { classyNarwhal } from '../../../cards/effects/classyNarwhal.ts';
import { darkAngelUnicorn } from '../../../cards/effects/darkAngelUnicorn.ts';
import { AlluringNarwhal } from './unicorn/AlluringNarwhal.ts';
import type { CardEffect } from './CardEffect.ts';

export const effects: Record<string, CardEffect> = {
  alluring_narwhal: AlluringNarwhal,
  changeOfLuck,
  backKick,
  blatant_thievery: blatantThievery,
  glitter_tornado: glitterTornado,
  good_deal: goodDeal,
  mystical_vortex: mysticalVortex,
  americorn: americorn,
  unicorn_poison: unicornPoison,
  annoying_flying_unicorn: annoyingFlyingUnicorn,
  chainsaw_unicorn: chainsawUnicorn,
  classy_narwhal: classyNarwhal,
  dark_angel_unicorn: darkAngelUnicorn,
};
