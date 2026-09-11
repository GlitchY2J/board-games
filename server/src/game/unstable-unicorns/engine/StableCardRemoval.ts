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
  includeUpgradesAndDowngrades = false,
): RemovedStableCard | undefined {
  for (const player of state.players) {
    if (allowedPlayerIds && !allowedPlayerIds.includes(player.id)) continue;

    const zones = includeUpgradesAndDowngrades
      ? [player.stable, player.upgrades, player.downgrades]
      : [player.stable];
    let card: Card | undefined;
    for (const zone of zones) {
      const index = zone.findIndex((candidate) => candidate.uid === cardId);
      if (index !== -1) {
        card = zone.splice(index, 1)[0];
        break;
      }
    }
    if (!card) continue;
    CardMovement.removeFromGame(state, player, card);
    return { card, playerId: player.id };
  }

  return undefined;
}
