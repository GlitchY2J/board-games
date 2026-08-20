import type { Player } from '../../models/Player.ts';
import { hasBlindingLight } from '../../cards/effects/blindingLight.ts';

export function getStablePower(player: Player): number {
  // Blinding Light neutraliza el efecto de Ginormous Unicorn: mientras esté
  // en el establo cuenta como un unicornio básico (1), no como 2.
  const ginormousCountsDouble = !hasBlindingLight(player);
  return player.stable.reduce((total, card) => {
    return total + (card.id === 'ginormous_unicorn' && ginormousCountsDouble ? 2 : 1);
  }, 0);
}
