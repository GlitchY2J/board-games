import Card from './Card';
import type { Card as GameCard } from '../../types/GameState';

interface Props {
  cards: GameCard[];
}

export default function Stable({ cards }: Props) {
  return (
    <div>
      <h2>Tu establo</h2>
      <div
        style={{
          minHeight: 200,
          border: '2px dashed #555',
          borderRadius: 12,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {cards.length === 0
          ? 'Vacio'
          : cards.map((card) => <Card key={card.id} title={card.name} />)}
      </div>
    </div>
  );
}
