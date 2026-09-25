import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '../../types/GameState';
import type { GameLogEntry } from '../../types/GameState';
import { socket } from '../../services/socket';
import { Info, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useCardPreview } from '../../context/useCardPreview';
import './PhasePanel.css';

interface Props {
  gameState: GameState;
  showRoundPhase?: boolean;
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

export default function PhasePanel({ gameState, showRoundPhase = true }: Props) {
  const [open, setOpen] = useState(false);
  const { showPreview, hidePreview } = useCardPreview();
  const localPlayer = gameState.players.find((p) => p.socketId === socket.id);
  const logEntries = useMemo(
    () => gameState.log ?? [],
    [gameState.log],
  );
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onHistoryShortcut = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'i') return;
      if (
        event.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)
      ) {
        return;
      }
      event.preventDefault();
      setOpen((isOpen) => !isOpen);
    };

    window.addEventListener('keydown', onHistoryShortcut);
    return () => window.removeEventListener('keydown', onHistoryShortcut);
  }, []);

  const playerColors = useMemo(() => {
    const map = new Map<string, (typeof PLAYER_COLORS)[number]>();

    gameState.players.forEach((player, index) => {
      map.set(player.id, PLAYER_COLORS[index % PLAYER_COLORS.length]);
    });

    return map;
  }, [gameState.players]);

  function renderEntry(entry: GameLogEntry) {
    const reactionImages = entry.reactionCardImages ?? (entry.reactionCardImage ? [entry.reactionCardImage] : []);
    const reactionBlocked = entry.reactionCardBlocked ?? [];
    const cardImages = entry.cardImages ?? (entry.cardImage ? [entry.cardImage] : []);
    const previewImage = (src: string, alt: string) => (
      <img
        className="history-card-thumbnail"
        src={src}
        alt={alt}
        onMouseEnter={(event) => showPreview(src, event.clientX, event.clientY)}
        onMouseMove={(event) => showPreview(src, event.clientX, event.clientY)}
        onMouseLeave={hidePreview}
      />
    );
    const renderBlockedCards = () => (
      <span className="history-blocked-cards history-neigh-chain">
        {entry.playerName && entry.text.startsWith(entry.playerName) && (
          <span>{entry.text.slice(entry.playerName.length).split('"')[0]}</span>
        )}
        {[...reactionImages].reverse().map((image, index) => {
          const sourceIndex = reactionImages.length - index - 1;
          const blocked = reactionBlocked[sourceIndex] ?? false;

          return (
            <span key={`${image}-${index}`} className="history-neigh-link">
            <span className="history-blocked-card history-neigh-card">
              {previewImage(image, `Neigh ${reactionImages.length - index}`)}
              {blocked && <span className="history-blocked-symbol" aria-hidden="true">⛔</span>}
            </span>
            <span className="history-blocked-arrow" aria-hidden="true">→</span>
          </span>
          );
        })}
        {entry.cardImage && (
          <span className="history-blocked-card">
            {previewImage(entry.cardImage, 'Carta original')}
            {(entry.originalCardBlocked ?? true) && (
              <span className="history-blocked-symbol" aria-hidden="true">⛔</span>
            )}
          </span>
        )}
      </span>
    );

    const renderStatusCard = (image: string, status: GameLogEntry['cardStatus'], alt: string) => (
      <span className="history-status-card">
        {previewImage(image, alt)}
        {status && <span className={`history-status-icon ${status}`} aria-hidden="true">{status === 'sacrificed' ? '🩸' : '💥'}</span>}
      </span>
    );

    if (entry.relatedCardImage && entry.cardImage) {
      return (
        <span className="history-blocked-cards">
          {renderStatusCard(entry.cardImage, entry.cardStatus, 'Carta origen')}
          <span className="history-blocked-arrow">→</span>
          {renderStatusCard(entry.relatedCardImage, entry.relatedCardStatus, 'Carta destruida')}
        </span>
      );
    }

    const renderText = (text: string) => {
      const textCardImages = entry.cardImages ?? (entry.cardImage ? [entry.cardImage] : []);
      if (textCardImages.length === 0) return text;

      const parts = text.split(/("[^"]+")/g);
      let imageIndex = 0;
      return (
        <>
          {parts.map((part, index) => {
            if (!part.startsWith('"') || !part.endsWith('"')) {
              return <span key={index}>{part}</span>;
            }

            const image = textCardImages[imageIndex++] ?? textCardImages.at(-1);
            if (!image) return <span key={index}>{part}</span>;
            return (
              <img
                key={index}
                className="history-card-thumbnail"
                src={image}
                alt={part.slice(1, -1)}
                onMouseEnter={(event) => showPreview(image, event.clientX, event.clientY)}
                onMouseMove={(event) => showPreview(image, event.clientX, event.clientY)}
                onMouseLeave={hidePreview}
              />
            );
          })}
        </>
      );
    };

    const renderDiscardedCards = () => (
      <span className="inline-flex items-center gap-1 ml-1 align-middle">
        {cardImages.map((image, index) => (
          <span key={`${image}-${index}`}>{previewImage(image, 'Carta descartada')}</span>
        ))}
      </span>
    );

    const renderPlayerBadge = () => {
      if (!entry.playerName) return null;
      const color = entry.playerId
        ? playerColors.get(entry.playerId) ?? PLAYER_COLORS[0]
        : PLAYER_COLORS[0];

      return (
        <span
          className="history-player-badge inline-block px-1.5 py-0.5 rounded-md font-black text-[9px] uppercase tracking-wide align-middle"
          style={{
            color: color.text,
            backgroundColor: color.bg,
            border: `1px solid ${color.border}`,
          }}
        >
          {entry.playerName}
        </span>
      );
    };

    if (entry.cards?.length) {
      const labels: Record<NonNullable<GameLogEntry['action']>, string> = {
        'activate-effect': 'activó el efecto de',
        discard: 'descartó',
        destroy: 'destruyó',
        sacrifice: 'sacrificó',
        'steal-hand': 'robó de la mano de',
        'steal-stable': 'robó del establo de',
        'recover-hand': 'trajo del descarte a su mano',
        'recover-stable': 'trajo del descarte a su establo',
        'search-deck': 'buscó en el mazo y llevó a su mano',
        move: 'movió',
      };
      const statusIcons: Record<string, string> = {
        discarded: '↘',
        destroyed: '💥',
        sacrificed: '🩸',
        stolen: '◆',
        recovered: '↥',
        searched: '⌕',
        moved: '→',
      };
      const renderCards = (role: 'source' | 'cost' | 'target' | 'result') => entry.cards!
        .filter((card) => card.role === role)
        .map((card, index) => (
          <span key={`${role}-${card.uid ?? card.image}-${index}`} className={`history-structured-card ${role}`}>
            {previewImage(card.image, card.name ?? `Carta ${role}`)}
            {card.status && <span className={`history-card-action ${card.status}`} aria-hidden="true">{statusIcons[card.status]}</span>}
          </span>
        ));
      const sourceCards = renderCards('source');
      const affectedCards = [...renderCards('cost'), ...renderCards('target'), ...renderCards('result')];

      return (
        <span className="history-structured-entry">
          {renderPlayerBadge()}
          {sourceCards.length > 0 && <span className="history-card-group source">{sourceCards}</span>}
          <span className="history-action-label">{entry.action ? labels[entry.action] ?? entry.text : entry.text}</span>
          {entry.targetPlayerName && <span className="history-target-player">{entry.targetPlayerName}</span>}
          {affectedCards.length > 0 && <span className="history-card-group affected">{affectedCards}</span>}
        </span>
      );
    }

    if (reactionImages.length > 0 && entry.cardImage && entry.playerName) {
      return (
        <>
          {renderPlayerBadge()}
          {renderBlockedCards()}
        </>
      );
    }

    if (entry.playerName && entry.text.startsWith(entry.playerName)) {
      return (
        <>
          {renderPlayerBadge()}
           <span>{renderText(entry.text.slice(entry.playerName.length))}</span>
            {entry.event === 'discard-card' && !entry.text.includes('"') && renderDiscardedCards()}
        </>
      );
    }

    return renderText(entry.text);
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
          <button
            className="phase-panel-close"
            title="Cerrar historial"
            onClick={() => setOpen(false)}
          >
            <X size={14} />
          </button>
          {showRoundPhase && <div className="phase-round-summary w-full px-4 py-1.5 rounded-xl glass-panel bg-slate-950/20 border border-slate-900/60 flex items-center justify-center gap-3 relative">
              <>
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
              </>
            </div>}
            <div className="phase-history w-full rounded-xl glass-panel bg-slate-950/20 border border-slate-900/60 overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-900/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                Historial
              </div>
              <div
                ref={logRef}
                className="px-3 py-2 max-h-44 overflow-y-auto flex flex-col gap-2"
              >
                {rounds.map((round) => (
                  <div key={round.turn} className="flex flex-col gap-1">
                    {showRoundPhase && (
                      <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center select-none">
                        ═════ Ronda {round.turn} ═════
                      </div>
                    )}
                    {round.entries.map((entry) => (
                      <div
                        key={entry.id}
                         className={cn(
                            "history-entry text-[11px] leading-snug",
                           !entry.playerName && "history-entry-system",
                           entry.playerId === localPlayer?.id
                             ? "text-emerald-300/90"
                             : "text-slate-400/90",
                          (entry.reactionCardImage || entry.reactionCardImages?.length || entry.relatedCardImage)
                            && "history-blocked-entry",
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
