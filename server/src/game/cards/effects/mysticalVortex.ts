import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { ActionResolver } from '../../unstable-unicorns/engine/ActionResolver.ts';
import { CardZoneMovement } from '../../unstable-unicorns/engine/CardZoneMovement.ts';

export const mysticalVortex: CardEffect = {
  onPlay(state, player, card) {
    const currentPlayerIdx = state.currentPlayer;
    const orderedPlayers = [
      ...state.players.slice(currentPlayerIdx),
      ...state.players.slice(0, currentPlayerIdx)
    ];

    const remainingPlayerIds = orderedPlayers
      .filter((candidate) => candidate.hand.some((handCard) =>
        candidate.id !== player.id || handCard.uid !== card.uid,
      ))
      .map((candidate) => candidate.id);

    if (remainingPlayerIds.length === 0) {
      CardZoneMovement.toDiscard(state, card);
      ActionResolver.advanceMysticalVortex(state, [], [], player.id);
      return true;
    }

    ActionResolver.advanceMysticalVortex(state, remainingPlayerIds, [], player.id);
  },
};
