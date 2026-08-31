import type { GameState } from '../../models/GameState.ts';
import type { Player } from '../../models/Player.ts';
import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import type { PendingAction } from '../../models/PendingAction.ts';
import { hasPandamonium } from './pandamonium.ts';

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

  const bwAction: PendingAction = {
    type: 'discard',
    reason: 'barbed_wire',
    playerId: player.id,
    cardsToDiscard: 1,
  };

  const existing = state.pendingAction;

  // Si ya hay un descarte pendiente de Barbed Wire para este mismo jugador,
  // simplemente incrementar el contador (sin crear una acción adicional).
  if (
    existing &&
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

  // Verificar si en la pila de reanudación ya hay un descarte de Barbed Wire
  // para este jugador, para acumularlo en lugar de duplicarlo.
  if (state.pendingResume?.length) {
    const queued = state.pendingResume.find(
      (a) =>
        a.type === 'discard' &&
        a.reason === 'barbed_wire' &&
        a.playerId === player.id,
    );
    if (queued) {
      (queued as typeof bwAction).cardsToDiscard = Math.min(
        (queued as typeof bwAction).cardsToDiscard + 1,
        player.hand.length,
      );
      return;
    }
  }

  // Si NO hay ninguna acción pendiente activa, Barbed Wire se convierte en la
  // acción activa inmediatamente.
  if (!existing) {
    state.pendingAction = bwAction;
    return;
  }

  // Si hay una acción activa (p. ej. la acción que acaba de destruir/sacrificar
  // una carta), NO la suspendemos porque ya está siendo resuelta (la carta ya
  // fue removida del establo). Suspenderla causaría que se re-ejecute al
  // reanudarla, disparando Barbed Wire de nuevo en un bucle infinito.
  // En su lugar, apilamos el descarte de Barbed Wire en pendingResume para que
  // se ejecute UNA VEZ que la acción actual termine limpiamente.
  if (!state.pendingResume) state.pendingResume = [];
  state.pendingResume.push(bwAction);
}

/**
 * Versión para cuando un unicornio ABANDONA el establo: solo dispara si el
 * jugador tiene Barbed Wire activo.
 */
export function maybeTriggerBarbedWireLeave(
  state: GameState,
  player: Player,
): void {
  // Pandamonium suppresses effects caused by a unicorn leaving this stable.
  // Entry is handled separately by CardMovement.enterStable and still triggers
  // Barbed Wire normally.
  if (hasPandamonium(player)) return;
  if (!hasBarbedWire(player)) return;
  triggerBarbedWireDiscard(state, player);
}

export const barbedWire: CardEffect = {
  // Efecto continuo/obligatorio: se maneja mediante los triggers de entrada y
  // salida del establo (CardMovement) y el bloqueo al jugar unicornios
  // (RulesEngine.stagePlay).
};
