import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { passiveModifier } from '../../unstable-unicorns/engine/effects/CardPassive.ts';

export function isImmuneToUnicornOrUpgradeDestruction(cardId: string): boolean {
  return (
    cardId === 'the_tiniest_unicorn' ||
    cardId === 'phantom_unicorn' ||
    cardId === 'saved_by_the_sigil'
  );
}

export function isImmuneToDestruction(cardId: string): boolean {
  return (
    cardId === 'the_tiniest_unicorn' ||
    cardId === 'unicorn_of_war' ||
    cardId === 'phantom_unicorn' ||
    cardId === 'saved_by_the_sigil'
  );
}

export function isImmuneToSacrifice(cardId: string): boolean {
  return cardId === 'phantom_unicorn' || cardId === 'saved_by_the_sigil';
}

export const theTiniestUnicorn: CardEffect = {
  passive: passiveModifier,
};
