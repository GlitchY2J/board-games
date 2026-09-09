import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { passiveModifier } from '../../unstable-unicorns/engine/effects/CardPassive.ts';

export function isImmuneToMagicDestruction(cardId: string): boolean {
  return cardId === 'magical_kittencorn';
}

export const magicalKittencorn: CardEffect = {
  passive: passiveModifier,
};
