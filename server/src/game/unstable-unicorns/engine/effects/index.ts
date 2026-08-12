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
import { greedyFlyingUnicorn } from '../../../cards/effects/greedyFlyingUnicorn.ts';
import { llamacorn } from '../../../cards/effects/llamacorn.ts';
import { darkAngelUnicorn } from '../../../cards/effects/darkAngelUnicorn.ts';
import { ginormousUnicorn } from '../../../cards/effects/ginormousUnicorn.ts';
import { extremelyDestructiveUnicorn } from '../../../cards/effects/extremelyDestructiveUnicorn.ts';
import { magicalFlyingUnicorn } from '../../../cards/effects/magicalFlyingUnicorn.ts';
import { magicalKittencorn } from '../../../cards/effects/magicalKittencorn.ts';
import { majesticFlyingUnicorn } from '../../../cards/effects/majesticFlyingUnicorn.ts';
import { mermaidUnicorn } from '../../../cards/effects/mermaidUnicorn.ts';
import { motherGooseUnicorn } from '../../../cards/effects/motherGooseUnicorn.ts';
import { narwhalTorpedo } from '../../../cards/effects/narwhalTorpedo.ts';
import { necromancerUnicorn } from '../../../cards/effects/necromancerUnicorn.ts';
import { AlluringNarwhal } from './unicorn/AlluringNarwhal.ts';
import { queenBeeUnicorn } from '../../../cards/effects/queenBeeUnicorn.ts';
import { rainbowUnicorn } from '../../../cards/effects/rainbowUnicorn.ts';
import { seductiveUnicorn } from '../../../cards/effects/seductiveUnicorn.ts';
import { sharkWithAHorn } from '../../../cards/effects/sharkWithAHorn.ts';
import { stabbyTheUnicorn } from '../../../cards/effects/stabbyTheUnicorn.ts';
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
  greedy_flying_unicorn: greedyFlyingUnicorn,
  llamacorn: llamacorn,
  dark_angel_unicorn: darkAngelUnicorn,
  ginormous_unicorn: ginormousUnicorn,
  extremely_destructive_unicorn: extremelyDestructiveUnicorn,
  magical_flying_unicorn: magicalFlyingUnicorn,
  magical_kittencorn: magicalKittencorn,
  majestic_flying_unicorn: majesticFlyingUnicorn,
  mermaid_unicorn: mermaidUnicorn,
  mother_goose_unicorn: motherGooseUnicorn,
  narwhal_torpedo: narwhalTorpedo,
  necromancer_unicorn: necromancerUnicorn,
  queen_bee_unicorn: queenBeeUnicorn,
  rainbow_unicorn: rainbowUnicorn,
  seductive_unicorn: seductiveUnicorn,
  shark_with_a_horn: sharkWithAHorn,
  stabby_the_unicorn: stabbyTheUnicorn,
};
