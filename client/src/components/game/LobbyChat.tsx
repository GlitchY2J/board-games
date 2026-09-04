import { useEffect, useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import type { ChatMessage } from '../../../../shared/types/Game.ts';
import type { PublicRoom } from '../../../../shared/types/PublicRoom.ts';
import type { ChatTypingEvent } from '../../../../shared/types/SocketEvents';
import { socket } from '../../services/socket';
import './Chat.css';

interface Props {
  room: PublicRoom;
  playerId: string;
}

export default function LobbyChat({ room, playerId }: Props) {
  const [draft, setDraft] = useState('');
  const [typingPlayers, setTypingPlayers] = useState<Record<string, string>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messages: ChatMessage[] = room.chat ?? [];
  const colors = useMemo(() => {
    const map = new Map<string, string>();
    room.players.forEach((player, index) => map.set(player.id, ['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#c084fc'][index % 5]));
    return map;
  }, [room.players]);

  useEffect(() => {
    const onChatTyping = (event: ChatTypingEvent) => {
      if (event.playerId === playerId) return;
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
  }, [playerId]);

  useEffect(() => () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    socket.emit('chat-typing', { roomCode: room.code, isTyping: false });
  }, [room.code]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  function send() {
    const text = draft.trim();
    if (!text) return;
    socket.emit('send-chat', { roomCode: room.code, text });
    socket.emit('chat-typing', { roomCode: room.code, isTyping: false });
    setDraft('');
  }

  function updateDraft(value: string) {
    setDraft(value);
    socket.emit('chat-typing', {
      roomCode: room.code,
      isTyping: value.trim().length > 0,
    });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (value.trim()) {
      typingTimerRef.current = setTimeout(() => {
        socket.emit('chat-typing', { roomCode: room.code, isTyping: false });
      }, 2500);
    }
  }

  return (
    <aside className="lobby-chat chat-panel">
      <div className="chat-header">Chat del lobby</div>
      <div ref={listRef} className="chat-list">
        {messages.map((message) => (
          <div key={message.id} className="chat-msg">
            <span className="chat-name" style={{ color: colors.get(message.playerId) ?? '#94a3b8' }}>
              {message.playerName}
            </span>
            <span className="chat-text">{message.text}</span>
          </div>
        ))}
        {messages.length === 0 && <div className="chat-empty">Sin mensajes todavía</div>}
      </div>
      {Object.values(typingPlayers).length > 0 && (
        <div className="chat-typing" aria-live="polite">
          <span>{Object.values(typingPlayers).join(', ')} está escribiendo</span>
          <span className="chat-typing-dots" aria-hidden="true"><i /> <i /> <i /></span>
        </div>
      )}
      <div className="chat-input-row">
        <input
          className="chat-input"
          value={draft}
          onChange={(event) => updateDraft(event.target.value)}
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

