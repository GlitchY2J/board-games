import Card from './Card';
import type { Card as GameCard } from '../../types/GameState';

interface Props {
  cards: GameCard[];
}

export default function Hand({ cards }: Props) {
  return (
    <div>
      <h2>Tu mano</h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {cards.map((card) => (
          <Card key={card.id} title={card.name} />
        ))}
      </div>
    </div>
  );
}
