import type { GameState } from '../types/GameState';

export function getPlayerStatus(
  gameState: GameState,
  playerId: string,
): string | undefined {
  const pending = gameState.pendingAction;

  if (pending) {
    const isActor =
      ('playerId' in pending && pending.playerId === playerId) ||
      ('sourcePlayerId' in pending && pending.sourcePlayerId === playerId);

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
          return 'Buscando carta...';
        case 'discard':
          return 'Descartando carta...';
        case 'alluring_narwhal':
        case 'glitter_tornado':
          return 'Eligiendo cartas...';
        case 'mystical_vortex':
          return 'Descartando carta...';
      }
    }
  }

  if (gameState.pendingPlay?.playerId === playerId) {
    return 'Jugando carta...';
  }

  const activePlayer = gameState.players[gameState.currentPlayer];
  if (activePlayer && activePlayer.id === playerId) {
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