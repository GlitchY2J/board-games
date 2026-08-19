import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '../../types/GameState';
import { socket } from '../../services/socket';
import { Send } from 'lucide-react';
import './Chat.css';

interface Props {
  gameState: GameState;
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

export default function Chat({ gameState }: Props) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const localPlayer = gameState.players.find((p) => p.socketId === socket.id);
  const messages = gameState.chat ?? [];

  const colors = useMemo(() => {
    const map = new Map<string, (typeof COLORS)[number]>();
    gameState.players.forEach((player, index) => {
      map.set(player.id, COLORS[index % COLORS.length]);
    });
    return map;
  }, [gameState.players]);

  // Auto-scroll: el chat muestra los mensajes más recientes primero (arriba).
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [messages.length]);

  function send() {
    const text = draft.trim();
    if (!text) return;
    socket.emit('send-chat', { roomCode: gameState.roomCode, text });
    setDraft('');
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">Chat</div>
      <div ref={listRef} className="chat-list">
        {[...messages].reverse().map((m) => {
          const c = colors.get(m.playerId) ?? COLORS[0];
          const isMine = m.playerId === localPlayer?.id;
          return (
            <div key={m.id} className={isMine ? 'chat-msg chat-msg-mine' : 'chat-msg'}>
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
          className="chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
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