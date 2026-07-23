import './CardFan.css';
import PlayingCard from './PlayingCard.tsx';
import type { GameState } from '../../types/GameState.ts';

type CardType = GameState['players'][number]['hand'][number];

interface Props {
  cards: CardType[];
  isMyTurn: boolean;
  onPlay(cardId: string): void;
}

export default function CardFan({ cards, isMyTurn, onPlay }: Props) {
  return (
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
              disabled={!isMyTurn}
              onClick={() => onPlay(card.id)}
            />
          </div>
        );
      })}
    </div>
  );
}
