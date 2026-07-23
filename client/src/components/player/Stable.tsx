import type { GameState } from '../../types/GameState';
import PlayingCard from '../card/PlayingCard';
import './Stable.css';

type Player = GameState['players'][number];

interface Props {
  player: Player;
}

export default function Stable({ player }: Props) {
  return (
    <div className="stable">
      <div className="stable-unicorns">
        {player.stable.map((card) => (
          <PlayingCard
            key={card.id}
            name={card.name}
            image={card.image}
            size="small"
          />
        ))}
      </div>

      <div className="stable-modifiers">
        <div className="stable-upgrades">
          {player.upgrades.map((card) => (
            <PlayingCard
              key={card.id}
              name={card.name}
              image={card.image}
              size="small"
            />
          ))}
        </div>

        <div className="stable-downgrades">
          {player.downgrades.map((card) => (
            <PlayingCard
              key={card.id}
              name={card.name}
              image={card.image}
              size="small"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
