import { useEffect, useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import type { ChatMessage } from '../../../../shared/types/Game.ts';
import type { PublicRoom } from '../../../../shared/types/PublicRoom.ts';
import { socket } from '../../services/socket';
import './Chat.css';

interface Props {
  room: PublicRoom;
}

export default function LobbyChat({ room }: Props) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const messages: ChatMessage[] = room.chat ?? [];
  const localPlayerId = getLocalPlayerId();
  const colors = useMemo(() => {
    const map = new Map<string, string>();
    room.players.forEach((player, index) => map.set(player.id, ['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#c084fc'][index % 5]));
    return map;
  }, [room.players]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  function send() {
    const text = draft.trim();
    if (!text) return;
    socket.emit('send-chat', { roomCode: room.code, text });
    setDraft('');
  }

  return (
    <aside className="lobby-chat chat-panel">
      <div className="chat-header">Chat del lobby</div>
      <div ref={listRef} className="chat-list">
        {messages.map((message) => (
          <div key={message.id} className="chat-msg">
            <span className="chat-name" style={{ color: colors.get(message.playerId) ?? '#94a3b8' }}>
              {message.playerName}{message.playerId === localPlayerId ? ' (Tú)' : ''}
            </span>
            <span className="chat-text">{message.text}</span>
          </div>
        ))}
        {messages.length === 0 && <div className="chat-empty">Sin mensajes todavía</div>}
      </div>
      <div className="chat-input-row">
        <input
          className="chat-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
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
    </aside>
  );
}

function getLocalPlayerId(): string | undefined {
  try {
    const session = localStorage.getItem('board-games-session');
    return session ? JSON.parse(session).playerId : undefined;
  } catch {
    return undefined;
  }
}
