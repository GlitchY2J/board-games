import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '../../types/GameState';
import { socket } from '../../services/socket';
import { Send } from 'lucide-react';
import { cn } from '../../lib/cn';
import './Chat.css';

interface Props {
  gameState: GameState;
  initialOpen?: boolean;
  onClose?: () => void;
}

const COLORS = [
  { text: '#f87171', bg: 'rgba(248,113,113,0.16)', border: 'rgba(248,113,113,0.45)' },
  { text: '#60a5fa', bg: 'rgba(96,165,250,0.16)', border: 'rgba(96,165,250,0.45)' },
  { text: '#34d399', bg: 'rgba(52,211,153,0.16)', border: 'rgba(52,211,153,0.45)' },
  { text: '#fbbf24', bg: 'rgba(251,191,36,0.16)', border: 'rgba(251,191,36,0.45)' },
  { text: '#c084fc', bg: 'rgba(192,132,252,0.16)', border: 'rgba(192,132,252,0.45)' },
  { text: '#22d3ee', bg: 'rgba(34,211,238,0.16)', border: 'rgba(34,211,238,0.45)' },
  { text: '#f472b6', bg: 'rgba(244,114,182,0.16)', border: 'rgba(244,114,182,0.45)' },
  { text: '#a3e635', bg: 'rgba(163,230,53,0.16)', border: 'rgba(163,230,53,0.45)' },
];

const CHAT_IDLE_TIMEOUT = 4000;

export default function Chat({ gameState, initialOpen = false, onClose }: Props) {
  const [draft, setDraft] = useState('');
  const [isOpen, setIsOpen] = useState(initialOpen);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef(0);
  const focusOnOpenRef = useRef(initialOpen);
  const localPlayer = gameState.players.find((p) => p.socketId === socket.id);
  const messages = gameState.chat ?? [];

  const colors = useMemo(() => {
    const map = new Map<string, (typeof COLORS)[number]>();
    gameState.players.forEach((player, index) => {
      map.set(player.id, COLORS[index % COLORS.length]);
    });
    return map;
  }, [gameState.players]);

  const hideChat = useCallback(() => {
    if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    idleTimerRef.current = null;
    inputRef.current?.blur();
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  // Auto-scroll al final: los mensajes más recientes se posicionan abajo.
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length, isOpen]);

  useEffect(() => {
    if (messages.length === 0) return;

    // Los mensajes entrantes hacen visible el chat, pero no roban el foco.
    focusOnOpenRef.current = false;
    lastActivityRef.current = Date.now();

    const openTimer = setTimeout(() => setIsOpen(true), 0);
    return () => clearTimeout(openTimer);
  }, [messages.length]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const isTextField =
        target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        hideChat();
        return;
      }

      if (event.key === 'Enter' && !isTextField && !isOpen && !event.isComposing) {
        event.preventDefault();
        focusOnOpenRef.current = true;
        setIsOpen(true);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hideChat, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (focusOnOpenRef.current) {
      inputRef.current?.focus();
      focusOnOpenRef.current = false;
    }
    lastActivityRef.current = Date.now();
    idleTimerRef.current = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= CHAT_IDLE_TIMEOUT) {
        hideChat();
      }
    }, 250);

    return () => {
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
      idleTimerRef.current = null;
    };
  }, [hideChat, isOpen]);

  function resetIdleTimer() {
    if (!isOpen) return;
    lastActivityRef.current = Date.now();
  }

  function send() {
    const text = draft.trim();
    if (!text) return;
    socket.emit('send-chat', { roomCode: gameState.roomCode, text });
    setDraft('');
    resetIdleTimer();
  }

  if (!isOpen) return null;

  return (
    <div className="chat-panel" onMouseMove={resetIdleTimer} onFocus={resetIdleTimer}>
      <div className="chat-header">Chat</div>
      <div ref={listRef} className="chat-list">
        {messages.map((m, i) => {
          const c = colors.get(m.playerId) ?? COLORS[0];
          const isMine = m.playerId === localPlayer?.id;
          const isLatest = i === messages.length - 1;
          return (
            <div
              key={m.id}
              className={cn(
                'chat-msg',
                isMine && 'chat-msg-mine',
                isLatest && 'chat-msg-latest',
              )}
            >
              <span
                className="chat-name"
                style={{ color: c.text, backgroundColor: c.bg, border: `1px solid ${c.border}` }}
              >
                {m.playerName}
              </span>
              <span className="chat-text">{m.text}</span>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div className="chat-empty">Sin mensajes todavía</div>
        )}
      </div>
      <div className="chat-input-row">
        <input
          ref={inputRef}
          className="chat-input"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            resetIdleTimer();
          }}
          onInput={resetIdleTimer}
          onKeyDown={(e) => {
            resetIdleTimer();
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Escribe un mensaje..."
          maxLength={500}
        />
        <button className="chat-send" onClick={send} disabled={!draft.trim()} title="Enviar">
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
