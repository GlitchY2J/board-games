import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import {
  getCardPassive,
  passiveModifier,
} from '../../unstable-unicorns/engine/effects/CardPassive.ts';

export function isImmuneToUnicornOrUpgradeDestruction(cardId: string): boolean {
  return getCardPassive({ id: cardId }).immuneToUnicornOrUpgradeDestruction === true;
}

export function isImmuneToDestruction(cardId: string): boolean {
  return getCardPassive({ id: cardId }).immuneToDestruction === true;
}

export function isImmuneToSacrifice(cardId: string): boolean {
  return getCardPassive({ id: cardId }).immuneToSacrifice === true;
}

export const theTiniestUnicorn: CardEffect = {
  passive: passiveModifier,
};
