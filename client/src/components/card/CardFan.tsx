import './CardFan.css';
import PlayingCard from './PlayingCard.tsx';
import type { GameState } from '../../types/GameState.ts';
import { useState } from 'react';

type CardType = GameState['players'][number]['hand'][number];

interface Props {
  cards: CardType[];
  isMyTurn: boolean;
  gamePhase: string;
  onPlay(cardId: string): void;
}

export default function CardFan({ cards, isMyTurn, gamePhase, onPlay }: Props) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  return (
    <>
      <div className="card-fan">
        {cards.map((card, index) => {
          const total = cards.length;
          const middle = (total - 1) / 2;
          const rotation = (index - middle) * 6;
          return (
            <div
              key={card.id}
              className="fan-card"
              style={{ transform: `rotate(${rotation}deg)`, zIndex: index }}
            >
              <PlayingCard
                name={card.name}
                image={card.image}
                size="large"
                disabled={!isMyTurn || gamePhase !== 'ACTION'}
                selected={selectedCardId === card.id}
                onClick={() => {
                  if (!isMyTurn) return;

                  if (gamePhase !== 'ACTION') return;

                  if (selectedCardId === card.id) {
                    setSelectedCardId(null);
                  } else {
                    setSelectedCardId(card.id);
                  }
                }}
              />
            </div>
          );
        })}
      </div>
      {selectedCardId && (
        <div className="play-panel">
          <button
            className="cancel-button"
            onClick={() => setSelectedCardId(null)}
          >
            Cancel
          </button>
          <button
            className="play-button"
            onClick={() => {
              onPlay(selectedCardId);
              setSelectedCardId(null);
            }}
          >
            Play Card
          </button>
        </div>
      )}
    </>
  );
}
