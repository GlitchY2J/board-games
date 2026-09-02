import { useState } from 'react';
import type { Card } from '../../types/GameState';
import PlayingCard from '../card/PlayingCard';
import { useCardPreview } from '../../context/useCardPreview';
import './AlterTheFutureOverlay.css';

interface Props {
  candidates: Card[];
  onConfirm(orderedIds: string[]): void;
}

export default function AlterTheFutureOverlay({ candidates, onConfirm }: Props) {
  const { hidePreview } = useCardPreview();
  const [orderedCards, setOrderedCards] = useState(candidates);
  const [draggedUid, setDraggedUid] = useState<string | null>(null);
  const [dropTargetUid, setDropTargetUid] = useState<string | null>(null);

  function moveCard(fromUid: string, toUid: string) {
    if (fromUid === toUid) return;
    setOrderedCards((cards) => {
      const fromIndex = cards.findIndex((card) => card.uid === fromUid);
      const toIndex = cards.findIndex((card) => card.uid === toUid);
      if (fromIndex < 0 || toIndex < 0) return cards;
      const next = [...cards];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  return (
    <div className="overlay-backdrop">
      <div className="card-selection-window choice-window alter-the-future-window">
        <h2>🔮 Alter the Future</h2>
        <p>Arrastra las cartas para elegir el orden en que regresan al mazo.</p>
        <div className="alter-the-future-cards">
          {orderedCards.map((card, index) => (
            <div
              key={card.uid}
              className={`alter-the-future-card${draggedUid === card.uid ? ' is-dragging' : ''}${dropTargetUid === card.uid && draggedUid !== card.uid ? ' is-drop-target' : ''}`}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                hidePreview();
                setDraggedUid(card.uid);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragEnter={() => {
                hidePreview();
                setDropTargetUid(card.uid);
              }}
              onDrop={() => {
                if (draggedUid) moveCard(draggedUid, card.uid);
                setDraggedUid(null);
                setDropTargetUid(null);
              }}
              onDragEnd={() => {
                setDraggedUid(null);
                setDropTargetUid(null);
              }}
            >
              <span>{index + 1}</span>
              <PlayingCard name={card.name} image={card.image} size="medium" disabled />
            </div>
          ))}
        </div>
        <button
          className="confirm-button choice-button"
          onClick={() => onConfirm(orderedCards.map((card) => card.uid))}
        >
          Confirmar orden
        </button>
      </div>
    </div>
  );
}
