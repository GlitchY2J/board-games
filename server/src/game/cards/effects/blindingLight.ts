import type { Player } from '../../models/Player.ts';
import type { Card } from '../../models/Card.ts';

export const BLINDING_LIGHT_ID = 'blinding_light';

export function hasBlindingLight(player: Player): boolean {
  return player.downgrades.some((card) => card.id === BLINDING_LIGHT_ID);
}

/** True si el efecto de un unicornio debe bloquearse por Blinding Light.
 *  Mientras Blinding Light esté en el establo, todos los unicornios (excepto
 *  los Baby) se consideran unicornios básicos: no activan ninguno de sus
 *  efectos. */
export function isEffectBlockedByBlindingLight(
  player: Player,
  card: Card,
): boolean {
  return (
    card.cardType === 'unicorn' &&
    card.unicornClass !== 'baby' &&
    hasBlindingLight(player)
  );
}