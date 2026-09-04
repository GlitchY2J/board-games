import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '../../types/GameState';
import { socket } from '../../services/socket';
import { Send } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { ChatTypingEvent } from '../../../../shared/types/SocketEvents';
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

const CHAT_IDLE_TIMEOUT = 10000;

export default function Chat({ gameState, initialOpen = false, onClose }: Props) {
  const [draft, setDraft] = useState('');
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [idleProgress, setIdleProgress] = useState(0);
  const [typingPlayers, setTypingPlayers] = useState<Record<string, string>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    setDraft('');
    socket.emit('chat-typing', { roomCode: gameState.roomCode, isTyping: false });
    setIdleProgress(0);
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    const onChatTyping = (event: ChatTypingEvent) => {
      if (event.playerId === localPlayer?.id) return;
      setTypingPlayers((current) => {
        if (!event.isTyping) {
          const next = { ...current };
          delete next[event.playerId];
          return next;
        }
        return { ...current, [event.playerId]: event.playerName };
      });
    };

    socket.on('chat-typing', onChatTyping);
    return () => {
      socket.off('chat-typing', onChatTyping);
    };
  }, [localPlayer?.id]);

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

      if (event.key.toLowerCase() === 'c' && !isTextField && !isOpen && !event.isComposing) {
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
      const progress = Math.min(
        1,
        (Date.now() - lastActivityRef.current) / CHAT_IDLE_TIMEOUT,
      );
      setIdleProgress(progress);
      if (progress >= 1) {
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
    setIdleProgress(0);
  }

  function send() {
    const text = draft.trim();
    if (!text) return;
    socket.emit('send-chat', { roomCode: gameState.roomCode, text });
    socket.emit('chat-typing', { roomCode: gameState.roomCode, isTyping: false });
    setDraft('');
    resetIdleTimer();
  }

  function updateDraft(value: string) {
    setDraft(value);
    socket.emit('chat-typing', {
      roomCode: gameState.roomCode,
      isTyping: value.trim().length > 0,
    });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (value.trim()) {
      typingTimerRef.current = setTimeout(() => {
        socket.emit('chat-typing', { roomCode: gameState.roomCode, isTyping: false });
      }, 2500);
    }
    resetIdleTimer();
  }

  if (!isOpen) return null;

  return (
    <div
      className="chat-panel"
      style={{ opacity: 1 - idleProgress * 0.85 }}
      onMouseEnter={resetIdleTimer}
      onMouseMove={resetIdleTimer}
      onFocus={resetIdleTimer}
    >
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
      {Object.values(typingPlayers).length > 0 && (
        <div className="chat-typing" aria-live="polite">
          <span>{Object.values(typingPlayers).join(', ')} está escribiendo</span>
          <span className="chat-typing-dots" aria-hidden="true"><i /> <i /> <i /></span>
        </div>
      )}
      <div className="chat-input-row">
        <input
          ref={inputRef}
          className="chat-input"
          value={draft}
          onChange={(e) => updateDraft(e.target.value)}
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
