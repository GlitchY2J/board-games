import './CenterArea.css';
import PlayingCard from '../card/PlayingCard';
import type { GameState } from '../../types/GameState';

interface Props {
  gameState: GameState;
}

export default function CenterArea({ gameState }: Props) {
  const discardTop = gameState.discard[gameState.discard.length - 1];

  return (
    <div className="center-area">
      <div className="pile">
        <div className="pile-title">Nursery</div>

        <PlayingCard
          name="Nursery"
          image="/cards/base/baby_unicorn_black.png"
          size="medium"
        />
      </div>
      <div className="pile">
        <div className="pile-title">Deck</div>

        <PlayingCard name="Deck" image="" hidden size="medium" />
      </div>
      <div className="pile">
        <div className="pile-title">Discard</div>
        {discardTop ? (
          <PlayingCard
            name={discardTop.name}
            image={discardTop.image}
            size="medium"
          />
        ) : (
          <PlayingCard name="Discard" image="" hidden size="medium" />
        )}
      </div>
    </div>
  );
}
