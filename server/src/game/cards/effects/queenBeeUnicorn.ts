import type { GameState } from '../../models/GameState.ts';
import type { Card } from '../../models/Card.ts';
import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import {
  getCardPassive,
  passiveForQueenBee,
} from '../../unstable-unicorns/engine/effects/CardPassive.ts';
import { hasBlindingLight } from './blindingLight.ts';

export const QUEEN_BEE_ID = 'queen_bee_unicorn';

export function getQueenBeeOwnerId(state: GameState): string | undefined {
  for (const player of state.players) {
    if (player.stable.some((card) => getCardPassive(card).blocksBasicUnicornEntry)) {
      return player.id;
    }
  }
  return undefined;
}

export function isBasicUnicornEntryBlocked(
  state: GameState,
  targetPlayerId: string,
): boolean {
  const ownerId = getQueenBeeOwnerId(state);
  if (!ownerId) return false;

  // Blinding Light anula el efecto continuo de Queen Bee mientras esté en el
  // mismo establo: los demás jugadores sí pueden jugar unicornios básicos.
  const owner = state.players.find((p) => p.id === ownerId);
  if (owner && hasBlindingLight(owner)) return false;

  return targetPlayerId !== ownerId;
}

export const queenBeeUnicorn: CardEffect = {
  passive: passiveForQueenBee,
};
