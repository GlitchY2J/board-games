import { useEffect } from 'react';
import type { GameState } from '../../types/GameState';
import { socket } from '../../services/socket';
import { ArrowRight } from 'lucide-react';

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

  // Double Dutch: tras jugar 1 carta (actionPlaysRemaining === 1) el jugador
  // debe poder terminar el turno manualmente, incluso con el modo automático.
  const doubleDutchCanEnd =
    gameState.phase === 'ACTION' && gameState.actionPlaysRemaining === 1;

  const showButton =
    (gameState.phase === 'ACTION' &&
      (gameState.actionUsed || gameState.actionPlaysRemaining === 1)) ||
    gameState.phase === 'END';

  useEffect(() => {
    if (!isActivePlayer || !showButton) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 't') return;
      if (
        event.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)
      ) {
        return;
      }
      event.preventDefault();
      socket.emit('next-phase', gameState.roomCode);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, isActivePlayer, showButton]);

  if (!isActivePlayer) return null;

  if (autoEnabled && !doubleDutchCanEnd) return null;

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
