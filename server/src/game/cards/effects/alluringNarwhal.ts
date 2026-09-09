import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const alluringNarwhal: CardEffect = {
  onEnterStable(state, player, card) {
    const opponentsWithUpgrades = state.players.filter(
      (candidate) =>
        candidate.id !== player.id &&
        (candidate.upgrades.length > 0 ||
          candidate.stable.some((stableCard) => stableCard.cardType === 'upgrade')),
    );

    if (opponentsWithUpgrades.length === 0) return;

    state.pendingAction = {
      type: 'alluring_narwhal',
      playerId: player.id,
      sourceCardId: card.id,
    };
  },
};
