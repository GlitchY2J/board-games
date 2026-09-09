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

export const unicornOfDeath: CardEffect = {
  canBeginTurn(state, player) {
    return (
      player.stable.some(
        (card) =>
          card.cardType === 'unicorn' && !isPandamoniumProtected(player, card),
      ) && hasUnicornOfDeathTarget(state, player.id)
    );
  },
  onBeginningTurn(state, player, card) {
    state.pendingAction = {
      type: 'select_choice',
      reason: 'unicorn_of_death',
      playerId: player.id,
      title: '💀 Unicorn of Death',
      description:
        '¿Deseas SACRIFICAR un unicornio de tu establo para luego DESTRUIR un unicornio de otro establo?',
      options: [
        { value: 'yes', text: 'Sí, sacrificar y destruir' },
        { value: 'no', text: 'No, omitir el efecto' },
      ],
      effectCardId: card.uid,
    };
    return true;
  },
};
