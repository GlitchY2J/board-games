import type { CardEffect } from '../CardEffect.ts';
import { chainsawMassicorn } from '../../../../cards/effects/chainsawMassicorn.ts';
import { dancingClownicorn } from '../../../../cards/effects/dancingClownicorn.ts';
import { demonicorn } from '../../../../cards/effects/demonicorn.ts';
import { jackTheReapercorn } from '../../../../cards/effects/jackTheReapercorn.ts';
import { phantomUnicorn } from '../../../../cards/effects/phantomUnicorn.ts';
import { playfulPuppetUnicorn } from '../../../../cards/effects/playfulPuppetUnicorn.ts';
import { sweetOldLadycorn } from '../../../../cards/effects/sweetOldLadycorn.ts';
import { unicornSlasher } from '../../../../cards/effects/unicornSlasher.ts';
import { vengefulUnicorn } from '../../../../cards/effects/vengefulUnicorn.ts';
import { wingedHorrorcorn } from '../../../../cards/effects/wingedHorrorcorn.ts';
import { heeeeeresStabby } from '../../../../cards/effects/heeeeeresStabby.ts';
import { possession } from '../../../../cards/effects/possession.ts';
import { reanimation } from '../../../../cards/effects/reanimation.ts';
import { supernaturalSelection } from '../../../../cards/effects/supernaturalSelection.ts';
import { theCornjuring } from '../../../../cards/effects/theCornjuring.ts';
import { nightmareCurrentlyIndisposed } from '../../../../cards/effects/nightmareCurrentlyIndisposed.ts';
import { nightmareExorciseRegimen } from '../../../../cards/effects/nightmareExorciseRegimen.ts';
import { nightmareBuriedAlive } from '../../../../cards/effects/nightmareBuriedAlive.ts';
import { nightmareExistentialDread } from '../../../../cards/effects/nightmareExistentialDread.ts';
import { ghostGuide } from '../../../../cards/effects/ghostGuide.ts';
import { paranormalAffection } from '../../../../cards/effects/paranormalAffection.ts';
import { poltergeistSwipe } from '../../../../cards/effects/poltergeistSwipe.ts';
import { savedByTheSigil } from '../../../../cards/effects/savedByTheSigil.ts';
import { strangeCraftProject } from '../../../../cards/effects/strangeCraftProject.ts';

export const nightmaresEffects: Record<string, CardEffect> = {
  chainsaw_massicorn: chainsawMassicorn,
  dancing_clownicorn: dancingClownicorn,
  demonicorn,
  jack_the_reapercorn: jackTheReapercorn,
  phantom_unicorn: phantomUnicorn,
  playful_puppet_unicorn: playfulPuppetUnicorn,
  sweet_old_ladycorn: sweetOldLadycorn,
  unicorn_slasher: unicornSlasher,
  vengeful_unicorn: vengefulUnicorn,
  winged_horrorcorn: wingedHorrorcorn,
  heeeeeres_stabby: heeeeeresStabby,
  possession,
  reanimation,
  supernatural_selection: supernaturalSelection,
  the_cornjuring: theCornjuring,
  nightmare_currently_indisposed: nightmareCurrentlyIndisposed,
  nightmare_exorcise_regimen: nightmareExorciseRegimen,
  nightmare_buried_alive: nightmareBuriedAlive,
  nightmare_existential_dread: nightmareExistentialDread,
  ghost_guide: ghostGuide,
  paranormal_affection: paranormalAffection,
  poltergeist_swipe: poltergeistSwipe,
  saved_by_the_sigil: savedByTheSigil,
  strange_craft_project: strangeCraftProject,
};
