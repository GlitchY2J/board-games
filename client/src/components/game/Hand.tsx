import Card from './Card';
import type { Card as GameCard } from '../../types/GameState';

interface Props {
  cards: GameCard[];
  onPlay(cardId: string): void;
}

export default function Hand({ cards, onPlay }: Props) {
  return (
    <div>
      <h2>Tu mano</h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {cards.map((card) => (
          <div key={card.id} onClick={() => onPlay(card.id)}>
            <Card title={card.name} />
          </div>
        ))}
      </div>
    </div>
  );
}
