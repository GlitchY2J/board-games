import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { getCardPassive } from '../../unstable-unicorns/engine/effects/CardPassive.ts';

export const glitterUnicorn: CardEffect = {
  onEnterStable(state, player) {
    const blockedByBrokenStable = player.downgrades.some(
      (card) => getCardPassive(card).blocksUpgradePlay,
    );
    const hasPlayableUpgrade =
      !blockedByBrokenStable &&
      player.hand.some((card) => card.cardType === 'upgrade');

    if (!hasPlayableUpgrade) return;

    state.pendingAction = {
      type: 'select_hand_card',
      reason: 'glitter_unicorn',
      sourcePlayerId: player.id,
      targetPlayerId: player.id,
    };
  },
};
