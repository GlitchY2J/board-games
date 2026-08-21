import type { GameState } from '../../models/GameState.ts';
import type { PendingAction } from '../../models/PendingAction.ts';
import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { isPandamoniumProtected } from './pandamonium.ts';
import { isImmuneToDestruction } from './theTiniestUnicorn.ts';

export function hasUnicornOfWarTarget(
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
          !isImmuneToDestruction(card.id),
      ),
  );
}

export function nextUnicornOfWarChoice(
  state: GameState,
  sourcePlayerId: string,
  remainingPlayerIds: string[],
): PendingAction | undefined {
  while (remainingPlayerIds.length > 0) {
    const playerId = remainingPlayerIds[0];
    remainingPlayerIds = remainingPlayerIds.slice(1);
    if (!hasUnicornOfWarTarget(state, playerId)) continue;

    return {
      type: 'select_choice',
      reason: 'unicorn_of_war',
      playerId,
      title: '⚔️ Unicorn of War',
      description: '¿Deseas DESTRUIR un unicornio de otro jugador?',
      options: [
        { value: 'yes', text: 'Sí, destruir un unicornio' },
        { value: 'no', text: 'No, omitir efecto' },
      ],
      sourcePlayerId,
      remainingPlayerIds,
    };
  }

  return undefined;
}

export const unicornOfWar: CardEffect = {
  onEnterStable(state, player) {
    const next = nextUnicornOfWarChoice(
      state,
      player.id,
      state.players.map((candidate) => candidate.id),
    );
    if (next) state.pendingAction = next;
  },
};
