import type { Player } from '../../models/Player.ts';
import type { Card } from '../../models/Card.ts';
import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const PANDAMONIUM_ID = 'pandamonium';

export function hasPandamonium(player: Player): boolean {
  return player.downgrades.some((card) => card.id === PANDAMONIUM_ID);
}

/** True si la carta es un unicornio que pertenece al establo de un jugador
 *  protegido por Pandamonium. Nadie (ni siquiera su dueño) puede hacerle
 *  nada a ese unicornio mientras Pandamonium esté en ese establo. */
export function isPandamoniumProtected(player: Player, card: Card): boolean {
  return card.cardType === 'unicorn' && hasPandamonium(player);
}

/** True si el jugador tiene al menos un unicornio en su establo que NO está
 *  protegido por Pandamonium (es decir, un unicornio que sí puede ser
 *  afectado por efectos). */
export function hasAvailableUnicorn(player: Player): boolean {
  return player.stable.some(
    (c) => c.cardType === 'unicorn' && !isPandamoniumProtected(player, c),
  );
}

/** True si el jugador tiene alguna carta de su establo (unicornio, upgrade o
 *  downgrade) que pueda sacrificar/destruir, es decir, que no esté protegida. */
export function hasAvailableCardToSacrifice(player: Player): boolean {
  return (
    player.stable.some((c) => !isPandamoniumProtected(player, c)) ||
    player.upgrades.length > 0 ||
    player.downgrades.length > 0
  );
}

export const pandamonium: CardEffect = {
  onEnterStable() {
    // Passive: los unicornios de este establo no pueden ser afectados por
    // ninguna carta y su dueño no puede ganar la partida mientras esté activo.
  },
};
