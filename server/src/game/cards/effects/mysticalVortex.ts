import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';
import { ActionResolver } from '../../unstable-unicorns/engine/ActionResolver.ts';

export const mysticalVortex: CardEffect = {
  onPlay(state, player) {
    // Todos los jugadores deben descartar una carta. Empezamos en orden de turno
    // partiendo del jugador actual.
    const currentPlayerIdx = state.currentPlayer;
    const orderedPlayers = [
      ...state.players.slice(currentPlayerIdx),
      ...state.players.slice(0, currentPlayerIdx)
    ];

    const remainingPlayerIds = orderedPlayers.map((p) => p.id);

    // Avanza la acción para saltar jugadores sin cartas y barajar al final si nadie tiene cartas
    ActionResolver.advanceMysticalVortex(state, remainingPlayerIds);
  },
};
