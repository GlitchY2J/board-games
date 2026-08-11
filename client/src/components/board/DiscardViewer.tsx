import { X } from 'lucide-react';
import PlayingCard from '../card/PlayingCard';
import type { GameState } from '../../types/GameState';

interface Props {
  gameState: GameState;
  onClose(): void;
}

export default function DiscardViewer({ gameState, onClose }: Props) {
  const cards = [...gameState.discard].reverse();

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div
        className="card-selection-window"
        style={{ position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="discard-close" onClick={onClose} aria-label="Cerrar">
          <X size={16} />
        </button>

        <h2>Pila de descarte</h2>
        <p>
          {gameState.discard.length}{' '}
          {gameState.discard.length === 1 ? 'carta' : 'cartas'}
        </p>

        <div className="card-selection-grid">
          {cards.map((card) => (
            <div key={card.uid} className="selection-card">
              <div className="selection-card-content">
                <PlayingCard name={card.name} image={card.image} size="large" />
                <div className="selection-card-title">{card.name}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
