import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { CardMovement } from '../../unstable-unicorns/engine/CardMovement.ts';

export const narwhalTorpedo: CardEffect = {
  onEnterStable(state) {
    for (const player of state.players) {
      const downgrades = [...player.downgrades];

      for (const downgrade of downgrades) {
        CardMovement.destroyOrSacrifice(state, player, downgrade);
      }

      player.downgrades = [];
    }
  },
};