import type { GameState } from '../../types/GameState';
import './Stable.css';
import StableSlot from './StableSlot';

type Player = GameState['players'][number];

interface Props {
  player: Player;
}

export default function Stable({ player }: Props) {
  return (
    <div className="stable">
      <div className="stable-unicorns">
        {Array.from({ length: 10 }).map((_, index) => (
          <StableSlot key={index} card={player.stable[index]} />
        ))}
      </div>
      <div className="stable-modifiers">
        <div className="stable-upgrades">
          {Array.from({ length: 5 }).map((_, index) => (
            <StableSlot key={index} card={player.upgrades[index]} />
          ))}
        </div>
        <div className="stable-downgrades">
          {Array.from({ length: 5 }).map((_, index) => (
            <StableSlot key={index} card={player.downgrades[index]} />
          ))}
        </div>
      </div>
    </div>
  );
}
