import type { Player } from '../../models/Player.ts';

export function getStablePower(player: Player): number {
  return player.stable.reduce((total, card) => {
    return total + (card.id === 'ginormous_unicorn' ? 2 : 1);
  }, 0);
}
