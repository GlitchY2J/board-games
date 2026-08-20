import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '../../types/GameState';
import type { GameLogEntry } from '../../types/GameState';
import { socket } from '../../services/socket';
import { Info, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import './PhasePanel.css';

interface Props {
  gameState: GameState;
}

const PLAYER_COLORS = [
  { text: '#f87171', bg: 'rgba(248,113,113,0.16)', border: 'rgba(248,113,113,0.45)' },
  { text: '#60a5fa', bg: 'rgba(96,165,250,0.16)', border: 'rgba(96,165,250,0.45)' },
  { text: '#34d399', bg: 'rgba(52,211,153,0.16)', border: 'rgba(52,211,153,0.45)' },
  { text: '#fbbf24', bg: 'rgba(251,191,36,0.16)', border: 'rgba(251,191,36,0.45)' },
  { text: '#c084fc', bg: 'rgba(192,132,252,0.16)', border: 'rgba(192,132,252,0.45)' },
  { text: '#22d3ee', bg: 'rgba(34,211,238,0.16)', border: 'rgba(34,211,238,0.45)' },
  { text: '#f472b6', bg: 'rgba(244,114,182,0.16)', border: 'rgba(244,114,182,0.45)' },
  { text: '#a3e635', bg: 'rgba(163,230,53,0.16)', border: 'rgba(163,230,53,0.45)' },
];

export default function PhasePanel({ gameState }: Props) {
  const [open, setOpen] = useState(false);
  const localPlayer = gameState.players.find((p) => p.socketId === socket.id);
  const logEntries = gameState.log ?? [];
  const logRef = useRef<HTMLDivElement>(null);

  const playerColors = useMemo(() => {
    const map = new Map<string, (typeof PLAYER_COLORS)[number]>();

    gameState.players.forEach((player, index) => {
      map.set(player.id, PLAYER_COLORS[index % PLAYER_COLORS.length]);
    });

    return map;
  }, [gameState.players]);

  function renderEntry(entry: GameLogEntry) {
    if (entry.playerName && entry.text.startsWith(entry.playerName)) {
      const color = entry.playerId
        ? playerColors.get(entry.playerId) ?? PLAYER_COLORS[0]
        : PLAYER_COLORS[0];

      return (
        <>
          <span
            className="inline-block px-1.5 py-0.5 mr-1 rounded-md font-black text-[9px] uppercase tracking-wide align-middle"
            style={{
              color: color.text,
              backgroundColor: color.bg,
              border: `1px solid ${color.border}`,
            }}
          >
            {entry.playerName}
          </span>
          <span>{entry.text.slice(entry.playerName.length)}</span>
        </>
      );
    }

    return entry.text;
  }

  const rounds = useMemo(() => {
    const groups: { turn: number; entries: GameLogEntry[] }[] = [];

    for (const entry of logEntries) {
      const last = groups[groups.length - 1];

      if (last && last.turn === entry.turn) {
        last.entries.push(entry);
      } else {
        groups.push({ turn: entry.turn, entries: [entry] });
      }
    }

    return groups;
  }, [logEntries]);

  // Auto-scroll hacia abajo para mostrar siempre las acciones más recientes al final
  useEffect(() => {
    if (!open) return;

    const scrollToBottom = () => {
      if (logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight;
      }
    };

    scrollToBottom();
    const frameId = requestAnimationFrame(scrollToBottom);
    const timeoutId = setTimeout(scrollToBottom, 50);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timeoutId);
    };
  }, [logEntries.length, open]);

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
    <div className={cn('phase-panel', open && 'phase-panel-open')}>
      {!open ? (
        <button
          className="phase-panel-toggle"
          title="Información de la partida"
          onClick={() => setOpen(true)}
        >
          <Info size={20} />
        </button>
      ) : (
        <div className="phase-panel-body">
          <div className="w-full px-4 py-1.5 rounded-xl glass-panel bg-slate-950/20 border border-slate-900/60 flex items-center justify-center gap-3 relative">
            <button
              className="phase-panel-close"
              title="Cerrar información"
              onClick={() => setOpen(false)}
            >
              <X size={14} />
            </button>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Ronda{' '}
            </span>
            <span className="text-sm font-black text-amber-400">
              {gameState.turn}
            </span>
            <span className={cn(
              "px-3 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase border",
              getPhaseColor(gameState.phase)
            )}>
              {gameState.phase}
            </span>
          </div>
            <div className="w-full rounded-xl glass-panel bg-slate-950/20 border border-slate-900/60 overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-900/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                Historial
              </div>
              <div
                ref={logRef}
                className="px-3 py-2 max-h-44 overflow-y-auto flex flex-col gap-2"
              >
                {rounds.map((round) => (
                  <div key={round.turn} className="flex flex-col gap-1">
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center select-none">
                      ═════ Ronda {round.turn} ═════
                    </div>
                    {round.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className={cn(
                          "text-[10px] leading-snug",
                          entry.playerId === localPlayer?.id
                            ? "text-emerald-300/90"
                            : "text-slate-400/90",
                        )}
                      >
                        {renderEntry(entry)}
                      </div>
                    ))}
                  </div>
                ))}
                {rounds.length === 0 && (
                  <div className="text-[10px] text-slate-600 text-center py-1">
                    Sin acciones aún
                  </div>
                )}
              </div>
            </div>
          </div>
      )}
    </div>
  );
}
