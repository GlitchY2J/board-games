import type { GameState } from '../../models/GameState.ts';
import type { Player } from '../../models/Player.ts';
import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { enqueueDrawAnimation } from '../../cardAnimations.ts';
import { VictoryManager } from '../../VictoryManager.ts';

export const SADISTIC_RITUAL_ID = 'sadistic_ritual';

export function hasSadisticRitual(player: Player): boolean {
  return player.downgrades.some((card) => card.id === SADISTIC_RITUAL_ID);
}

/**
 * Roba 1 carta del mazo (fase de inicio de turno). Se llama DESPUÉS de haber
 * sacrificado el unicornio exigido por Sadistic Ritual.
 */
export function drawForSadisticRitual(state: GameState, player: Player): void {
  const card = state.deck.shift();
  if (!card) return;

  enqueueDrawAnimation(state.roomCode, player.id, card);
  player.hand.push(card);

  VictoryManager.checkWinner(state);
}

export const sadisticRitual: CardEffect = {
  // Efecto continuo de inicio de turno: se gestiona en TurnManager
  // (collectBeginningEffects / startBeginningEffect) y en ActionResolver
  // (handleSelectStableCard con reason 'sadistic_ritual').
};