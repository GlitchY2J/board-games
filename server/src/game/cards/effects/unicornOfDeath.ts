import type { GameState } from '../../models/GameState.ts';
import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { isPandamoniumProtected } from './pandamonium.ts';
import { isImmuneToUnicornOrUpgradeDestruction } from './theTiniestUnicorn.ts';

export function hasUnicornOfDeathTarget(
  state: GameState,
  sourcePlayerId: string,
): boolean {
  return state.players.some(
    (player) =>
      player.id !== sourcePlayerId &&
      player.stable.some(
        (card) =>
          card.cardType === 'unicorn' &&
          !isPandamoniumProtected(player, card) &&
          !isImmuneToUnicornOrUpgradeDestruction(card.id),
      ),
  );
}

export const unicornOfDeath: CardEffect = {};
