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
import { frenchiecorn } from '../../../cards/effects/frenchiecorn.ts';
import { glitterUnicorn } from '../../../cards/effects/glitterUnicorn.ts';
import { theTiniestUnicorn } from '../../../cards/effects/theTiniestUnicorn.ts';
import { unicornOfDeath } from '../../../cards/effects/unicornOfDeath.ts';
import { unicornOfFamine } from '../../../cards/effects/unicornOfFamine.ts';
import { unicornOfPestilence } from '../../../cards/effects/unicornOfPestilence.ts';
import { unicornOfWar } from '../../../cards/effects/unicornOfWar.ts';
import { unicornRainbowPrincess } from '../../../cards/effects/unicornRainbowPrincess.ts';
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
import { shabbyTheNarwhal } from '../../../cards/effects/shabbyTheNarwhal.ts';
import { swiftyFlyingUnicorn } from '../../../cards/effects/swiftyFlyingUnicorn.ts';
import { theGreatNarwhal } from '../../../cards/effects/theGreatNarwhal.ts';
import { unicornOnTheCob } from '../../../cards/effects/unicornOnTheCob.ts';
import { unicornPhoenix } from '../../../cards/effects/unicornPhoenix.ts';
import { kissOfLife } from '../../../cards/effects/kissOfLife.ts';
import { shakeUp } from '../../../cards/effects/shakeUp.ts';
import { twoForOne } from '../../../cards/effects/twoForOne.ts';
import { unfairBargain } from '../../../cards/effects/unfairBargain.ts';
import { unicornSwap } from '../../../cards/effects/unicornSwap.ts';
import { unicornOracle } from '../../../cards/effects/unicornOracle.ts';
import { reTarget } from '../../../cards/effects/reTarget.ts';
import { resetButton } from '../../../cards/effects/resetButton.ts';
import { targetedDestruction } from '../../../cards/effects/targetedDestruction.ts';
import { pandamonium } from '../../../cards/effects/pandamonium.ts';
import { tinyStable } from '../../../cards/effects/tinyStable.ts';
import { doubleDutch } from '../../../cards/effects/doubleDutch.ts';
import { barbedWire } from '../../../cards/effects/barbedWire.ts';
import { sadisticRitual } from '../../../cards/effects/sadisticRitual.ts';
import { adorableFlyingUnicorn } from '../../../cards/effects/adorableFlyingUnicorn.ts';
import { angelUnicorn } from '../../../cards/effects/angelUnicorn.ts';
import { cottonCandyUnicorn } from '../../../cards/effects/cottonCandyUnicorn.ts';
import type { CardEffect } from './CardEffect.ts';

export const effects: Record<string, CardEffect> = {
  adorable_flying_unicorn: adorableFlyingUnicorn,
  angel_unicorn: angelUnicorn,
  cotton_candy_unicorn: cottonCandyUnicorn,
  cotton_candy_llamacorn: cottonCandyUnicorn,
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
  frenchiecorn: frenchiecorn,
  glitter_unicorn: glitterUnicorn,
  the_tiniest_unicorn: theTiniestUnicorn,
  unicorn_of_death: unicornOfDeath,
  unicorn_of_famine: unicornOfFamine,
  unicorn_of_pestilence: unicornOfPestilence,
  unicorn_of_war: unicornOfWar,
  unicorn_rainbow_princess: unicornRainbowPrincess,
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
  shabby_the_narwhal: shabbyTheNarwhal,
  swift_flying_unicorn: swiftyFlyingUnicorn,
  the_great_narwhal: theGreatNarwhal,
  unicorn_on_the_cob: unicornOnTheCob,
  unicorn_oracle: unicornOracle,
  unicorn_phoenix: unicornPhoenix,
  kiss_of_life: kissOfLife,
  shake_up: shakeUp,
  two_for_one: twoForOne,
  unfair_bargain: unfairBargain,
  unicorn_swap: unicornSwap,
  re_target: reTarget,
  reset_button: resetButton,
  targeted_destruction: targetedDestruction,
  pandamonium,
  tiny_stable: tinyStable,
  double_dutch: doubleDutch,
  barbed_wire: barbedWire,
  sadistic_ritual: sadisticRitual,
};
