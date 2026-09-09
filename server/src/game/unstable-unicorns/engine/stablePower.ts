import type { Player } from '../../models/Player.ts';
import { hasBlindingLight } from '../../cards/effects/blindingLight.ts';
import { getCardPassive } from './effects/CardPassive.ts';

export function getStablePower(player: Player): number {
  // Blinding Light neutraliza el efecto de Ginormous Unicorn: mientras esté
  // en el establo cuenta como un unicornio básico (1), no como 2.
  const ginormousCountsDouble = !hasBlindingLight(player);
  return player.stable.reduce((total, card) => {
    const passive = getCardPassive(card);
    const deltaBlocked =
      passive.stablePowerDeltaBlockedByBlindingLight && !ginormousCountsDouble;
    return total + 1 + (deltaBlocked ? 0 : passive.stablePowerDelta ?? 0);
  }, 0);
}
