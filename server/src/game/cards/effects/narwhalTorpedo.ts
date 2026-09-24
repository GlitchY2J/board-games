import type { Player } from '../../models/Player.ts';
import type { GameState } from '../../models/GameState.ts';
import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { CardMovement } from '../../unstable-unicorns/engine/CardMovement.ts';

export const narwhalTorpedo: CardEffect = {
  onEnterStable(state: GameState, player: Player, card) {
    // Solo se sacrifican los downgrades del establo en el que ENTRA esta carta,
    // no los de todos los jugadores.
    if (player.downgrades.length === 0) return;

    state.pendingAction = {
      type: 'select_choice',
      reason: 'narwhal_torpedo',
      playerId: player.id,
      title: '🐋 Narwhal Torpedo',
      description: '¿Deseas sacrificar todos los Downgrades de tu establo?',
      options: [
        { value: 'yes', text: 'Sí, sacrificar Downgrades' },
        { value: 'no', text: 'No, omitir efecto' },
      ],
      effectCardId: card.uid,
      sourceCardImage: card.image,
    };
  },
};
