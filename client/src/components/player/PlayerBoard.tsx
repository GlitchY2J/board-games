import type { GameState } from '../../types/GameState';

import './PlayerBoard.css';
import PlayerInfo from './PlayerInfo';
import Stable from './Stable';

type Player = GameState['players'][number];

interface Props {
  player: Player;
  isLocalPlayer: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  isMyTurn: boolean;
  gamePhase: string;
  onPlay(cardId: string): void;
}

export default function PlayerBoard({ player, position }: Props) {
  return (
    <div className={`player-board ${position}`}>
      {position === 'top' ? (
        <>
          <div className="stable">
            <Stable player={player} />
          </div>
          <PlayerInfo player={player} />
        </>
      ) : (
        <>
          <PlayerInfo player={player} />
          <div className="stable">
            <Stable player={player} />
          </div>
        </>
      )}
    </div>
  );
}
