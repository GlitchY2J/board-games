import type { Player } from '../../models/Player.ts';
import type { GameState } from '../../models/GameState.ts';
import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { getStablePower } from '../../unstable-unicorns/engine/stablePower.ts';
import { EffectStack } from '../../unstable-unicorns/engine/EffectStack.ts';
import { hasPandamonium } from './pandamonium.ts';

export const TINY_STABLE_ID = 'tiny_stable';

export function hasTinyStable(player: Player): boolean {
  return player.downgrades.some((card) => card.id === TINY_STABLE_ID);
}

/** Cuántos unicornios superan el límite de 5 (Ginormous Unicorn cuenta como 2). */
export function tinyStableExcess(player: Player): number {
  return Math.max(0, getStablePower(player) - 5);
}

/** True si el jugador debe sacrificar unicornios por Tiny Stable: tiene Tiny
 *  Stable, no está bloqueado por Pandamonium y supera el límite de 5. */
export function tinyStableActive(player: Player): boolean {
  return (
    hasTinyStable(player) &&
    !hasPandamonium(player) &&
    tinyStableExcess(player) > 0
  );
}

export function makeTinyStableAction(playerId: string) {
  return {
    type: 'select_stable_card',
    reason: 'tiny_stable',
    sourcePlayerId: playerId,
    targetPlayerId: playerId,
    playerId,
  } as const;
}

/**
 * Chequeo continuo y obligatorio de Tiny Stable: si algún jugador tiene Tiny
 * Stable y supera el límite de 5 unicornios (y no está bloqueado por
 * Pandamonium), fuerza un sacrificio de unicornio. Se ejecuta después de cada
 * acción para garantizar el estado invariante "a cualquier momento".
 * Devuelve `true` si se encoló un sacrificio.
 */
export function checkTinyStable(game: GameState): boolean {
  for (const player of game.players) {
    if (!tinyStableActive(player)) continue;

    // Preservar cualquier acción pendiente/encadenada para reanudarla después
    // del sacrificio obligatorio.
    if (game.pendingAction) {
      EffectStack.suspend(game, game.pendingAction);
    }

    game.pendingAction = makeTinyStableAction(player.id);
    return true;
  }
  return false;
}

export const tinyStable: CardEffect = {
  onEnterStable() {
    // Passive: el límite de unicornios se aplica mediante checkTinyStable().
  },
};
