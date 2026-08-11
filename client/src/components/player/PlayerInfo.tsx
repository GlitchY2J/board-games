import type { GameState } from '../../types/GameState';
import { cn } from '../../lib/cn';
import { Sparkles, Layers } from 'lucide-react';

type Player = GameState['players'][number];

interface Props {
  player: Player;
  isActive?: boolean;
}

export default function PlayerInfo({ player, isActive = false }: Props) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-4 py-2 rounded-2xl transition-all duration-300',
        'glass-panel border w-full',
        isActive
          ? 'border-emerald-500/40 ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-500/10 bg-slate-950/40'
          : 'border-slate-800/40 bg-slate-950/20'
      )}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <span
          className={cn(
            'w-8 h-8 shrink-0 rounded-xl bg-gradient-to-br flex items-center justify-center text-slate-950 font-black text-xs uppercase shadow-inner',
            isActive
              ? 'from-emerald-400 to-cyan-500'
              : 'from-slate-700 to-slate-600'
          )}
        >
          {player.name.substring(0, 2)}
        </span>
        <div className="flex flex-col min-w-0">
          <span
            className={cn(
              'text-[13px] font-bold tracking-wide truncate leading-tight',
              isActive ? 'text-emerald-400' : 'text-slate-200'
            )}
          >
            {player.name}
          </span>
          <span className="text-[9px] text-slate-500 flex items-center gap-1.5 font-semibold uppercase tracking-wider">
            {isActive ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
                Tu Turno
              </>
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
            )}
            {!isActive && 'Esperando'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs shrink-0">
        <div
          className="flex items-center gap-1 bg-slate-950/50 px-2 py-1 rounded-lg border border-slate-800/50"
          title="Unicornios en el Establo"
        >
          <Sparkles size={11} className="text-amber-400" />
          <span className="font-extrabold text-slate-200 min-w-[16px] text-center">
            {player.stable.length}
          </span>
        </div>
        <div
          className="flex items-center gap-1 bg-slate-950/50 px-2 py-1 rounded-lg border border-slate-800/50"
          title="Cartas en Mano"
        >
          <Layers size={11} className="text-cyan-400" />
          <span className="font-extrabold text-slate-200 min-w-[16px] text-center">
            {player.hand.length}
          </span>
        </div>
      </div>
    </div>
  );
}
