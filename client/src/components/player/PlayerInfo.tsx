import type { GameState } from '../../types/GameState';
import { cn } from '../../lib/cn';
import { Sparkles, Layers } from 'lucide-react';
import { getStablePower } from '../../lib/stablePower';
import './PlayerInfo.css';

type Player = GameState['players'][number];

interface Props {
  player: Player;
  isActive?: boolean;
  status?: string;
}

export default function PlayerInfo({
  player,
  isActive = false,
  status,
}: Props) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-4 py-2 rounded-2xl transition-all duration-300',
        'glass-panel border w-full',
      )}
      style={{
        backgroundColor: isActive
          ? '#1e3a5f'
          : 'rgba(15, 23, 42, 0.4)',
        borderColor: isActive
          ? 'rgba(59, 130, 246, 0.6)'
          : 'rgba(71, 85, 105, 0.4)',
        boxShadow: isActive
          ? '0 0 0 1px rgba(59, 130, 246, 0.4)'
          : 'none',
      }}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {player.avatar ? (
          <span
            className={cn(
              'w-8 h-8 shrink-0 rounded-xl flex items-center justify-center overflow-hidden border',
              isActive
                ? 'border-emerald-400/60'
                : 'border-slate-600/40'
            )}
          >
            <img
              src={`/avatars/${player.avatar}.png`}
              alt={player.name}
              className="w-full h-full object-cover"
            />
          </span>
        ) : (
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
        )}
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
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                isActive
                  ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                  : 'bg-slate-600'
              )}
            ></span>
            {status ?? (isActive ? 'Tu Turno' : 'Esperando')}
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
            {getStablePower(player)}
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
