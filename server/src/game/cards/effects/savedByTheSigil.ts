import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export function hasSavedByTheSigil(player: { downgrades: { id: string }[] }): boolean {
  return player.downgrades.some((card) => card.id === 'saved_by_the_sigil');
}

export const savedByTheSigil: CardEffect = {};
