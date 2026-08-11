import type { GameState } from '../../types/GameState';
import { socket } from '../../services/socket';
import { User } from 'lucide-react';
import { cn } from '../../lib/cn';

interface Props {
  gameState: GameState;
}

export default function PhasePanel({ gameState }: Props) {
  const activePlayer = gameState.players[gameState.currentPlayer];
  const isActivePlayer = activePlayer.socketId === socket.id;

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'BEGINNING':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'DRAW':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'ACTION':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'END':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-3xl glass-panel bg-slate-950/20 border border-slate-900/60 text-center">
      <div className="flex items-center gap-2">
        <User size={13} className={cn(isActivePlayer ? 'text-emerald-400' : 'text-slate-400')} />
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
          Activo
        </span>
      </div>
      <div className={cn(
        "text-sm font-black tracking-wide truncate max-w-[160px]",
        isActivePlayer ? "text-emerald-400 animate-pulse" : "text-slate-200"
      )}>
        {activePlayer.name} {isActivePlayer && '(Tú)'}
      </div>
      <div className="w-px h-6 bg-slate-900/60" />
      <div className={cn(
        "px-3 py-1.5 rounded-xl text-[11px] font-black tracking-wider uppercase border",
        getPhaseColor(gameState.phase)
      )}>
        {gameState.phase}
      </div>
    </div>
  );
}
