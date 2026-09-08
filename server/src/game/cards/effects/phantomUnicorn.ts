import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const phantomUnicorn: CardEffect = {
  onEnterStable() {
    // Passive: this card cannot be sacrificed or destroyed.
  },
};
