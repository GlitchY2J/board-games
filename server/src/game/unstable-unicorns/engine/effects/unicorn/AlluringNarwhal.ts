import type { CardEffect } from '../CardEffect.ts';

export const AlluringNarwhal: CardEffect = {
  onEnterStable(state, player, card) {
    const opponentsWithUpgrades = state.players.filter(
      (p) => p.id !== player.id && (p.upgrades.length > 0 || p.stable.some((c) => c.cardType === 'upgrade')),
    );

    if (opponentsWithUpgrades.length === 0) {
      return;
    }

    state.pendingAction = {
      type: 'alluring_narwhal',
      playerId: player.id,
      sourceCardId: card.id,
    };
  },
};
