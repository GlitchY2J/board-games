import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import type { GameState } from '../../models/GameState.ts';
import { CardMovement } from '../../unstable-unicorns/engine/CardMovement.ts';
import { isImmuneToDestruction } from '../../cards/effects/theTiniestUnicorn.ts';
import { isPandamoniumProtected } from '../../cards/effects/pandamonium.ts';
import { enqueueShuffleAnimation } from '../../cardAnimations.ts';

function finish(state: GameState, playerId: string): void {
  const index = state.deck.findIndex(
    (card) => card.id === 'extremely_fertile_unicorn',
  );
  if (index !== -1) {
    const [unicorn] = state.deck.splice(index, 1);
    const player = state.players.find((candidate) => candidate.id === playerId);
    if (player) CardMovement.enterStable(state, player, unicorn);
  }
  for (let i = state.deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
  }
  enqueueShuffleAnimation(state.roomCode, playerId);
}

export const overpopulation: CardEffect = {
  onPlay(state, player) {
    const ownTargets = player.stable.filter(
      (card) =>
        card.cardType === 'unicorn' && !isPandamoniumProtected(player, card),
    );
    if (ownTargets.length === 0) return;

    for (const card of [...ownTargets]) {
      const index = player.stable.findIndex((stableCard) => stableCard.uid === card.uid);
      if (index !== -1) {
        const [removed] = player.stable.splice(index, 1);
        CardMovement.destroyOrSacrifice(state, player, removed, 'sacrifice');
      }
    }

    const remainingPlayerIds = state.players
      .filter(
        (target) =>
          target.id !== player.id &&
          target.stable.some(
            (card) =>
              card.cardType === 'unicorn' &&
              !isImmuneToDestruction(card.id) &&
              !isPandamoniumProtected(target, card),
          ),
      )
      .map((target) => target.id);

    if (remainingPlayerIds.length === 0) {
      finish(state, player.id);
      return;
    }

    state.pendingAction = {
      type: 'select_stable_card',
      reason: 'overpopulation_destroy',
      sourcePlayerId: player.id,
      targetPlayerId: remainingPlayerIds[0],
      remainingPlayerIds,
    };
  },
};
