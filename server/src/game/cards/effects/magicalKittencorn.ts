import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export function isImmuneToMagicDestruction(cardId: string): boolean {
  return cardId === 'magical_kittencorn';
}

export const magicalKittencorn: CardEffect = {
  onEnterStable() {
    // Passive: this card cannot be destroyed by Magic cards.
  },
};