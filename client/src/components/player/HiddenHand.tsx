import PlayingCard from '../card/PlayingCard';
import './HiddenHand.css';

interface Props {
  cardCount: number;
}

export default function HiddenHand({ cardCount }: Props) {
  return (
    <div className="hidden-hand">
      {Array.from({ length: cardCount }).map((_, index) => (
        <div key={index} className="hidden-card-wrapper">
          <PlayingCard
            key={index}
            name="Hidden Card"
            image=""
            hidden
            size="medium"
          />
        </div>
      ))}
    </div>
  );
}
