import type { CardEffect } from './CardEffect.ts';

export function composeEffectCatalog(
  baseEffects: Readonly<Record<string, CardEffect>>,
  expansionEffects: ReadonlyArray<Readonly<Record<string, CardEffect>>>,
): Record<string, CardEffect> {
  return Object.assign({}, baseEffects, ...expansionEffects);
}
