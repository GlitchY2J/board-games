import type { GameState } from '../../models/GameState.ts';
import type { Player } from '../../models/Player.ts';
import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const BARBED_WIRE_ID = 'barbed_wire';

export function hasBarbedWire(player: Player): boolean {
  return player.downgrades.some((card) => card.id === BARBED_WIRE_ID);
}

/**
 * Encola la obligación de descartar cartas por Barbed Wire.
 * No comprueba si el jugador tiene Barbed Wire (los llamadores ya lo validaron).
 * Cada unicornio que entra/sale suma una carta a descartar, pero nunca se
 * exige descartar más cartas de las que el jugador tiene en la mano en ese
 * momento. Si la mano está vacía, el efecto se ignora (acción imposible).
 */
export function triggerBarbedWireDiscard(
  state: GameState,
  player: Player,
): void {
  if (player.hand.length === 0) return;

  const existing = state.pendingAction;
  if (existing) {
    if (
      existing.type === 'discard' &&
      existing.reason === 'barbed_wire' &&
      existing.playerId === player.id
    ) {
      existing.cardsToDiscard = Math.min(
        existing.cardsToDiscard + 1,
        player.hand.length,
      );
      return;
    }
    if (!state.pendingResume) state.pendingResume = [];
    state.pendingResume.push(existing);
  }

  state.pendingAction = {
    type: 'discard',
    reason: 'barbed_wire',
    playerId: player.id,
    cardsToDiscard: 1,
  };
}

/**
 * Versión para cuando un unicornio ABANDONA el establo: solo dispara si el
 * jugador tiene Barbed Wire activo.
 */
export function maybeTriggerBarbedWireLeave(
  state: GameState,
  player: Player,
): void {
  if (!hasBarbedWire(player)) return;
  triggerBarbedWireDiscard(state, player);
}

export const barbedWire: CardEffect = {
  // Efecto continuo/obligatorio: se maneja mediante los triggers de entrada y
  // salida del establo (CardMovement) y el bloqueo al jugar unicornios
  // (RulesEngine.stagePlay).
};