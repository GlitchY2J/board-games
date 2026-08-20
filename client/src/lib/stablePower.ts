import type { Player } from '../../../shared/types/Player.ts';

export function getStablePower(player: Player): number {
  const ginormousCountsDouble = !player.downgrades.some(
    (card) => card.id === 'blinding_light',
  );
  return player.stable.reduce((total, card) => {
    return total + (card.id === 'ginormous_unicorn' && ginormousCountsDouble ? 2 : 1);
  }, 0);
}
