import type { Card } from '../../models/Card.ts';
import type { GameState } from '../../models/GameState.ts';
import { CardMovement } from './CardMovement.ts';

export interface RemovedStableCard {
  card: Card;
  playerId: string;
}

/** Removes a selected stable card and applies the shared leave-game rules. */
export function removeStableCardFromGame(
  state: GameState,
  cardId: string,
  allowedPlayerIds?: readonly string[],
): RemovedStableCard | undefined {
  for (const player of state.players) {
    if (allowedPlayerIds && !allowedPlayerIds.includes(player.id)) continue;

    const card = CardMovement.removeFromStable(player, cardId);
    if (!card) continue;
    CardMovement.removeFromGame(state, player, card);
    return { card, playerId: player.id };
  }

  return undefined;
}
