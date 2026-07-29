import PlayingCard from '../card/PlayingCard';
import './StableSlot.css';

interface Props {
  card?: {
    id: string;
    name: string;
    image: string;
  };
}

export default function StableSlot({ card }: Props) {
  if (card) {
    return <PlayingCard name={card.name} image={card.image} size="small" />;
  }

  return <div className="stable-slot-placeholder" />;
}
