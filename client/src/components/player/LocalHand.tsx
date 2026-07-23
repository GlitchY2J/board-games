import type { GameState } from '../../types/GameState';
import PlayingCard from '../card/PlayingCard';
import './LocalHand.css';

type Player = GameState['players'][number];

interface Props {
  player: Player;
  isMyTurn: boolean;
  onPlay(cardId: string): void;
}

export default function LocalHand({ player, isMyTurn, onPlay }: Props) {
  return (
    <div className="local-hand">
      {player.hand.map((card) => (
        <PlayingCard
          key={card.id}
          name={card.name}
          image={card.image}
          size="large"
          disabled={!isMyTurn}
          onClick={() => onPlay(card.id)}
        />
      ))}
    </div>
  );
}
