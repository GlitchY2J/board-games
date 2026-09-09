import type { Player } from '../../models/Player.ts';
import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { passiveModifier } from '../../unstable-unicorns/engine/effects/CardPassive.ts';

export const DOUBLE_DUTCH_ID = 'double_dutch';

export function hasDoubleDutch(player: Player): boolean {
  return player.upgrades.some((card) => card.id === DOUBLE_DUTCH_ID);
}

export const doubleDutch: CardEffect = {
  passive: passiveModifier,
};
