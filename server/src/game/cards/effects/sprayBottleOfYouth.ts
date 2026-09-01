import type { GameState } from '../../models/GameState.ts';
import type { Player } from '../../models/Player.ts';
import type { PendingAction } from '../../models/PendingAction.ts';
import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { isImmuneToDestruction } from './theTiniestUnicorn.ts';
import { isPandamoniumProtected } from './pandamonium.ts';

export function nextSprayBottleChoice(
  state: GameState,
  sourcePlayerId: string,
  playerIds: string[],
): PendingAction | undefined {
  const remaining = [...playerIds];

  while (remaining.length > 0) {
    const playerId = remaining.shift()!;
    const player = state.players.find((candidate) => candidate.id === playerId);
    const hasBaby = state.nursery.some(
      (card) => card.cardType === 'unicorn' && card.unicornClass === 'baby',
    );

    if (player && hasBaby) {
      return {
        type: 'select_choice',
        reason: 'spray_bottle_of_youth',
        playerId,
        sourcePlayerId,
        remainingPlayerIds: remaining,
        title: '🧴 Spray Bottle Of Youth',
        description: '¿Deseas traer un Baby Unicorn de la Nursery a tu establo?',
        options: [
          { value: 'yes', text: 'Sí, traer un Baby Unicorn' },
          { value: 'no', text: 'No, omitir efecto' },
        ],
      };
    }
  }

  return undefined;
}

export const sprayBottleOfYouth: CardEffect = {
  onPlay(state: GameState, player: Player) {
    const opponents = state.players.filter((candidate) => candidate.id !== player.id);
    const destroyableOpponentIds = opponents
      .filter((opponent) =>
        opponent.stable.some(
          (card) =>
            card.cardType === 'unicorn' &&
            !isImmuneToDestruction(card.id) &&
            !isPandamoniumProtected(opponent, card),
        ),
      )
      .map((opponent) => opponent.id);

    if (destroyableOpponentIds.length > 0) {
      state.pendingAction = {
        type: 'select_stable_card',
        reason: 'spray_bottle_of_youth_destroy',
        sourcePlayerId: player.id,
        targetPlayerId: destroyableOpponentIds[0],
        remainingPlayerIds: destroyableOpponentIds,
        sprayPlayerIds: opponents.map((opponent) => opponent.id),
      };
      return;
    }

    state.pendingAction = nextSprayBottleChoice(
      state,
      player.id,
      opponents.map((opponent) => opponent.id),
    );
  },
};
