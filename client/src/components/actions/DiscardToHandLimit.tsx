import { useState } from 'react';
import { socket } from '../../services/socket';
import type { GameState } from '../../types/GameState';

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
    socket.emit('discard-cards', {
      roomCode: gameState.roomCode,
      playerId,
      cardIds: selected,
    });
  }

  return (
    <div className="action-overlay">
      <h2>Descarta {amount} carta(s)</h2>

      <div className="hand">
        {player?.hand.map((card) => (
          <button key={card.id} onClick={() => toggle(card.id)}>
            {selected.includes(card.id) ? '✅' : ''}
            {card.name}
          </button>
        ))}
      </div>
      <button disabled={selected.length !== amount} onClick={confirm}>
        Confirmar descarte
      </button>
    </div>
  );
}
