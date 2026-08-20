import type { GameState } from '../../types/GameState';
import { socket } from '../../services/socket';
import { ArrowRight } from 'lucide-react';
import { useEffect } from 'react';

interface Props {
  gameState: GameState;
  autoEnabled?: boolean;
}

export default function PhaseActionButton({ gameState, autoEnabled = false }: Props) {
  const activePlayer = gameState.players[gameState.currentPlayer];
  const isActivePlayer = activePlayer.socketId === socket.id;

  function nextPhase() {
    if (!isActivePlayer) return;
    socket.emit('next-phase', gameState.roomCode);
  }

  // Enter = avanzar de fase (terminar turno) cuando el botón está visible.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      }
      if (e.isComposing) return;
      if (e.code !== 'Enter') return;
      // No avanzar mientras haya una carta o acción pendiente de resolver.
      if (!isActivePlayer) return;
      if (gameState.pendingPlay || gameState.pendingAction) return;

      const doubleDutchCanEnd =
        gameState.phase === 'ACTION' && gameState.actionPlaysRemaining === 1;
      if (autoEnabled && !doubleDutchCanEnd) return;

      const showButton =
        (gameState.phase === 'ACTION' &&
          (gameState.actionUsed || gameState.actionPlaysRemaining === 1)) ||
        gameState.phase === 'END';

      if (!showButton) return;

      e.preventDefault();
      e.stopPropagation();
      nextPhase();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, isActivePlayer, autoEnabled]);

  function getButtonText() {
    switch (gameState.phase) {
      case 'ACTION':
        return 'Terminar Turno';
      case 'END':
        return 'Finalizar Turno';
      default:
        return 'Siguiente Fase';
    }
  }

  if (!isActivePlayer) return null;

  // Double Dutch: tras jugar 1 carta (actionPlaysRemaining === 1) el jugador
  // debe poder terminar el turno manualmente, incluso con el modo automático.
  const doubleDutchCanEnd =
    gameState.phase === 'ACTION' && gameState.actionPlaysRemaining === 1;

  if (autoEnabled && !doubleDutchCanEnd) return null;

  const showButton =
    (gameState.phase === 'ACTION' &&
      (gameState.actionUsed || gameState.actionPlaysRemaining === 1)) ||
    gameState.phase === 'END';

  if (!showButton) return null;

  return (
    <button
      onClick={nextPhase}
      className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider glow-btn-emerald border border-emerald-400/20 active:scale-95 transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
    >
      {getButtonText()}
      <ArrowRight size={14} />
    </button>
  );
}
