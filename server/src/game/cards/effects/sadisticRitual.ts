import type { GameState } from '../../models/GameState.ts';
import type { Player } from '../../models/Player.ts';
import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { enqueueDrawAnimation } from '../../cardAnimations.ts';
import { CardZoneMovement } from '../../unstable-unicorns/engine/CardZoneMovement.ts';
import { VictoryManager } from '../../VictoryManager.ts';
import { hasAvailableUnicorn } from './pandamonium.ts';

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
  CardZoneMovement.addToHand(player, card);

  VictoryManager.checkWinner(state);
}

export const sadisticRitual: CardEffect = {
  canBeginTurn(_state, player) {
    return hasAvailableUnicorn(player);
  },
  onBeginningTurn(state, player) {
    state.pendingAction = {
      type: 'select_stable_card',
      reason: 'sadistic_ritual',
      sourcePlayerId: player.id,
    };
    return true;
  },
};
