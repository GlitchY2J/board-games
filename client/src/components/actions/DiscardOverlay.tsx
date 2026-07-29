import './DiscardOverlay.css';
import { useState } from 'react';
import { socket } from '../../services/socket';
import type { GameState } from '../../types/GameState';
import PlayingCard from '../card/PlayingCard';

interface Props {
  gameState: GameState;
  playerId: string;
}

export default function DiscardToHandLimit({ gameState, playerId }: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  const player = gameState.players.find((p) => p.id === playerId);

  const amount = gameState.pendingAction?.cardsToDiscard ?? 0;

  function toggle(cardId: string) {
    if (selected.includes(cardId)) {
      setSelected(selected.filter((id) => id !== cardId));
      return;
    }

    if (selected.length >= amount) return;

    setSelected([...selected, cardId]);
  }

  function confirm() {
    console.log(gameState.roomCode);
    socket.emit('discard-cards', {
      roomCode: gameState.roomCode,
      playerId,
      cardIds: selected,
    });
  }

  return (
    <div className="discard-overlay">
      <div className="discard-window">
        <div className="discard-title">Descarta cartas</div>
        <div className="discard-description">
          Selecciona {amount} carta(s) para continuar
        </div>
        <div className="discard-hand">
          {player?.hand.map((card) => (
            <div
              key={card.id}
              className={`discard-card ${selected.includes(card.id) ? 'selected' : ''}`}
              onClick={() => toggle(card.id)}
            >
              <PlayingCard name={card.name} image={card.image} size="medium" />
            </div>
          ))}
        </div>
        <button
          className="confirm-discard"
          disabled={selected.length !== amount}
          onClick={confirm}
        >
          Confirmar descarte({selected.length}/{amount})
        </button>
      </div>
    </div>
  );
}
