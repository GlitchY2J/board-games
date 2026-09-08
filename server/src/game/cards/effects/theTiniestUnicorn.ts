import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export function isImmuneToUnicornOrUpgradeDestruction(cardId: string): boolean {
  return cardId === 'the_tiniest_unicorn' || cardId === 'phantom_unicorn';
}

export function isImmuneToDestruction(cardId: string): boolean {
  return (
    cardId === 'the_tiniest_unicorn' ||
    cardId === 'unicorn_of_war' ||
    cardId === 'phantom_unicorn'
  );
}

export function isImmuneToSacrifice(cardId: string): boolean {
  return cardId === 'phantom_unicorn';
}

export const theTiniestUnicorn: CardEffect = {
  onEnterStable() {
    // Passive: this card cannot be destroyed by Unicorn or Upgrade cards.
  },
};
