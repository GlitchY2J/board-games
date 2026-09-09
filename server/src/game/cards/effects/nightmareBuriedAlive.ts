import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { CardMovement } from '../../unstable-unicorns/engine/CardMovement.ts';
import { hasAvailableUnicorn } from './pandamonium.ts';

export const nightmareBuriedAlive: CardEffect = {
  canBeginTurn(state, player) {
    return player.stable.some((card) => card.id === 'nightmare_buried_alive') ||
      state.players.length > 0;
  },
  onBeginningTurn(state, player, card) {
    if (!hasAvailableUnicorn(player)) {
      const index = player.downgrades.findIndex((downgrade) => downgrade.uid === card.uid);
      if (index !== -1) {
        const [buriedAlive] = player.downgrades.splice(index, 1);
        CardMovement.returnToHand(state, player, buriedAlive);
      }
      return false;
    }
    state.pendingAction = {
      type: 'select_stable_card',
      reason: 'nightmare_buried_alive_sacrifice',
      sourcePlayerId: player.id,
    };
    return true;
  },
};
