import type { GameState } from '../../types/GameState';
import { socket } from '../../services/socket';
import { ArrowRight } from 'lucide-react';

interface Props {
  gameState: GameState;
}

export default function PhaseActionButton({ gameState }: Props) {
  const activePlayer = gameState.players[gameState.currentPlayer];
  const isActivePlayer = activePlayer.socketId === socket.id;

  function nextPhase() {
    if (!isActivePlayer) return;
    socket.emit('next-phase', gameState.roomCode);
  }

  function getButtonText() {
    switch (gameState.phase) {
      case 'BEGINNING':
        return 'Comenzar Turno';
      case 'DRAW':
        return 'Robar Carta';
      case 'ACTION':
        return 'Terminar Acción';
      case 'END':
        return 'Finalizar Turno';
      default:
        return 'Siguiente Fase';
    }
  }

  const showButton =
    (isActivePlayer && gameState.phase !== 'ACTION') ||
    (isActivePlayer && gameState.phase === 'ACTION' && gameState.actionUsed);

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
