import type { GameState } from '../types/GameState';

export function getPlayerStatus(
  gameState: GameState,
  playerId: string,
  gameId?: string,
): string | undefined {
  const pending = gameState.pendingAction;

  if (pending) {
    const isActor =
      ('playerId' in pending && pending.playerId === playerId) ||
      ('sourcePlayerId' in pending && pending.sourcePlayerId === playerId) ||
      (pending.type === 'mystical_vortex' &&
        (pending.remainingPlayerIds.includes(playerId) ||
          pending.resolvedPlayerIds.includes(playerId))) ||
      ('remainingPlayerIds' in pending &&
        pending.remainingPlayerIds?.[0] === playerId);

    if (isActor) {
      switch (pending.type) {
        case 'select_hand_card':
          return pending.reason === 'americorn'
            ? 'Robando carta...'
            : 'Seleccionando carta...';
        case 'select_player':
          return pending.reason === 'americorn'
            ? 'Robando carta...'
            : 'Seleccionando jugador...';
        case 'select_stable_card':
          return 'Seleccionando carta...';
        case 'select_choice':
          return 'Eligiendo opción...';
        case 'select_discard_card':
          return 'Seleccionando carta del descarte...';
        case 'select_deck_card':
          if (pending.reason === 'exploding_kitten_defuse') {
            return 'Colocando Exploding Kitten...';
          }
          if (pending.reason === 'imploding_kitten_place') {
            return 'Colocando Imploding Kitten...';
          }
          return 'Buscando carta...';
        case 'select_nursery_card':
          return 'Eligiendo Baby Unicorn...';
        case 'select_own_hand_card':
          return 'Eligiendo unicornio básico...';
        case 'discard':
          return 'Descartando carta...';
        case 'alluring_narwhal':
        case 'glitter_tornado':
        case 'extremely_destructive_unicorn':
          return 'Eligiendo cartas...';
        case 'mystical_vortex':
          return pending.resolvedPlayerIds.includes(playerId)
            ? 'Esperando al resto...'
            : 'Descartando carta...';
      }
    }
  }

  if (gameState.pendingPlay?.playerId === playerId) {
    return 'Jugando carta...';
  }

  const activePlayer = gameState.players[gameState.currentPlayer];
  if (activePlayer && activePlayer.id === playerId) {
    if (gameId === 'exploding-kittens') {
      return 'Jugando cartas...';
    }

    if (gameState.phase === 'DRAW') {
      return 'Robando carta...';
    }
    if (gameState.phase === 'ACTION') {
      return gameState.actionUsed ? 'Finalizando turno...' : 'Jugando carta...';
    }
    if (gameState.phase === 'BEGINNING') {
      return 'Preparando turno...';
    }
    if (gameState.phase === 'END') {
      return 'Finalizando turno...';
    }
  }

  return undefined;
}
