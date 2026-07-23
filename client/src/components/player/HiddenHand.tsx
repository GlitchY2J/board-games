import PlayingCard from '../card/PlayingCard';
import './HiddenHand.css';

interface Props {
  cardCount: number;
}

export default function HiddenHand({ cardCount }: Props) {
  return (
    <div className="hidden-hand">
      {Array.from({ length: cardCount }).map((_, index) => (
        <PlayingCard
          key={index}
          name="Hidden Card"
          image=""
          hidden
          size="small"
        />
      ))}
    </div>
  );
}
