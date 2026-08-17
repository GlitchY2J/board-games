import type { Player } from '../../models/Player.ts';
import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const DOUBLE_DUTCH_ID = 'double_dutch';

export function hasDoubleDutch(player: Player): boolean {
  return player.upgrades.some((card) => card.id === DOUBLE_DUTCH_ID);
}

export const doubleDutch: CardEffect = {
  onEnterStable() {
    // Passive: el jugador activo puede jugar 2 cartas en su fase de acción.
    // La decisión (jugar 2 o robar 1) se presenta al inicio de la fase de acción.
  },
};
