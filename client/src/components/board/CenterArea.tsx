import './CenterArea.css';
import PlayingCard from '../card/PlayingCard';
import type { GameState } from '../../types/GameState';
import Deck from './Deck';

interface Props {
  gameState: GameState;
  isMyTurn: boolean;
  localPlayerId: string;
}

export default function CenterArea({
  gameState,
  isMyTurn,
  localPlayerId,
}: Props) {
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

        <Deck
          gameState={gameState}
          isMyTurn={isMyTurn}
          localPlayerId={localPlayerId}
        />
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
