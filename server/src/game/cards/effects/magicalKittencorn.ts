import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import {
  getCardPassive,
  passiveModifier,
} from '../../unstable-unicorns/engine/effects/CardPassive.ts';

export function isImmuneToMagicDestruction(cardId: string): boolean {
  return getCardPassive({ id: cardId }).immuneToMagicDestruction === true;
}

export const magicalKittencorn: CardEffect = {
  passive: passiveModifier,
};
