import type { Player } from '../../models/Player.ts';
import type { GameState } from '../../models/GameState.ts';
import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { CardMovement } from '../../unstable-unicorns/engine/CardMovement.ts';

export const narwhalTorpedo: CardEffect = {
  onEnterStable(state: GameState, player: Player) {
    // Solo se sacrifican los downgrades del establo en el que ENTRA esta carta,
    // no los de todos los jugadores.
    const downgrades = [...player.downgrades];

    for (const downgrade of downgrades) {
      CardMovement.destroyOrSacrifice(state, player, downgrade, 'sacrifice');
    }

    player.downgrades = [];
  },
};