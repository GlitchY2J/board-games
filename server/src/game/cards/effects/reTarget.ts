import type { CardEffect } from '../../unstable-unicorns/engine/effects/CardEffect.ts';

export const reTarget: CardEffect = {
  onPlay(state, player) {
    const otherPlayers = state.players.filter((p) => p.id !== player.id);

    const casterHasCards =
      player.upgrades.length > 0 || player.downgrades.length > 0;

    const othersWithCards = otherPlayers.filter(
      (p) => p.upgrades.length > 0 || p.downgrades.length > 0,
    );

    // Se necesita al menos un par (origen, destino) válido:
    //   - Desde mi establo hacia otro jugador: tengo cartas y hay al menos otro jugador
    //   - Entre otros dos jugadores: hay al menos 2 otros jugadores y 1 tiene cartas
    const canMoveFromSelf = casterHasCards && otherPlayers.length >= 1;
    const canMoveBetweenOthers =
      othersWithCards.length >= 1 && otherPlayers.length >= 2;

    if (!canMoveFromSelf && !canMoveBetweenOthers) return;

    state.pendingAction = {
      type: 'select_player',
      reason: 're_target_source',
      sourcePlayerId: player.id,
    };
  },
};